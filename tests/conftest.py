import os
from pathlib import Path
import sys
import pytest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
os.environ.setdefault('MPLCONFIGDIR',str(ROOT/'data/interim/matplotlib'))
os.environ.setdefault('LOKY_MAX_CPU_COUNT','2')
from src.predict import Predictor
from src.common import read_json

@pytest.fixture(scope='session')
def predictor():return Predictor()

@pytest.fixture
def healthy():return read_json(ROOT/'examples/manual_input.json')

@pytest.fixture
def high_risk():return read_json(ROOT/'examples/high_risk_input.json')
