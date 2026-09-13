"""Factory input boundary: implementations must map units before yielding readings."""
from abc import ABC, abstractmethod
import csv
from io import StringIO
from pathlib import Path
from typing import Iterable
import pandas as pd
from .schemas import SensorReading
from .feature_engineering import FEATURES

class FactoryInputAdapter(ABC):
    @abstractmethod
    def readings(self) -> Iterable[SensorReading]:
        """Yield validated readings with machine ID and timezone-aware event time."""
        raise NotImplementedError

def parse_csv(text, max_rows=1000):
    if not text.strip(): raise ValueError('CSV is empty')
    header=next(csv.reader(StringIO(text)))
    if len(header)!=len(set(header)): raise ValueError('CSV contains duplicate column names')
    df=pd.read_csv(StringIO(text),nrows=max_rows+1)
    if len(df)==0: raise ValueError('CSV must contain at least one data row')
    if len(df)>max_rows: raise ValueError(f'CSV exceeds the {max_rows}-row batch limit')
    allowed=set(SensorReading.model_fields)
    if set(df.columns)-allowed: raise ValueError(f'Unexpected CSV columns: {sorted(set(df.columns)-allowed)}')
    if set(FEATURES)-set(df.columns): raise ValueError(f'Missing required CSV columns: {sorted(set(FEATURES)-set(df.columns))}')
    records=[]
    for i,row in enumerate(df.to_dict(orient='records'),start=2):
        values={k:(None if pd.isna(v) else v) for k,v in row.items()}
        try: records.append(SensorReading.model_validate(values))
        except Exception as exc: raise ValueError(f'CSV row {i}: {exc}') from exc
    return records

class CSVFactoryAdapter(FactoryInputAdapter):
    def __init__(self,path,max_rows=1000): self.path=Path(path);self.max_rows=max_rows
    def readings(self):
        for reading in parse_csv(self.path.read_text(encoding='utf-8-sig'),self.max_rows):
            if not reading.machine_id or reading.event_timestamp is None:
                raise ValueError('Factory adapter requires machine_id and event_timestamp on every row')
            yield reading
