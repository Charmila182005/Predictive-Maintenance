"""Report data quality without repairing synthetic labels or modifying raw data."""
import numpy as np
import pandas as pd
from .common import ROOT, read_json, sha256, write_json
from .feature_engineering import FEATURES, NUMERIC, RENAME, TARGETS, MODES, UNITS

def load_dataset():
    path = ROOT/'data/raw/ai4i2020.csv'
    manifest = read_json(ROOT/'data/raw/manifest.json')
    expected = next(v['sha256'] for v in manifest['files'] if v['local_filename'].replace('\\','/').endswith('/ai4i2020.csv'))
    if sha256(path) != expected:
        raise ValueError('Raw dataset SHA-256 does not match the recorded original')
    df = pd.read_csv(path)
    expected_columns = {'UDI','Product ID', *RENAME, *TARGETS}
    if set(df.columns) != expected_columns:
        raise ValueError(f'Unexpected dataset columns: {list(df.columns)}')
    return df.rename(columns=RENAME)

def inspect_data(df):
    invalid = {}
    for c in NUMERIC:
        values = pd.to_numeric(df[c],errors='coerce')
        invalid[c] = int((~np.isfinite(values) | (values <= 0 if 'temperature' in c else values < 0)).sum())
    invalid['product_type'] = int((~df.product_type.isin(['L','M','H'])).sum())
    invalid_labels = {c:int((~df[c].isin([0,1])).sum()) for c in TARGETS}
    label_union = df[MODES].any(axis=1).astype(int)
    mismatch = df.index[label_union != df['Machine failure']].tolist()
    report = {
        'shape':list(df.shape),'original_columns':list(pd.read_csv(ROOT/'data/raw/ai4i2020.csv',nrows=0).columns),
        'canonical_columns':list(df.columns),'dtypes':df.dtypes.astype(str).to_dict(),'units':UNITS,
        'missing':df.isna().sum().to_dict(),'duplicate_full_records':int(df.duplicated().sum()),
        'duplicate_predictor_records':int(df.duplicated(FEATURES).sum()),'invalid_values':invalid,'invalid_labels':invalid_labels,
        'target_counts':{c:df[c].value_counts().sort_index().to_dict() for c in TARGETS},
        'failure_prevalence':float(df['Machine failure'].mean()),'mode_prevalence':df[MODES].mean().to_dict(),
        'product_type_counts':df.product_type.value_counts().to_dict(),
        'rows_with_multiple_failure_modes':int((df[MODES].sum(axis=1)>1).sum()),
        'overall_label_disagrees_with_mode_union':{'count':len(mismatch),'zero_based_row_indices':mismatch,'policy':'Preserve original labels; train overall and modes separately, report inconsistency.'},
        'numeric_summary':df[NUMERIC].describe().to_dict(),
        'suspicious_process_below_air_count':int((df.process_temperature<df.air_temperature).sum()),
        'zero_speed_count':int((df.rotational_speed==0).sum()),
        'leakage_controls':'Strict six-feature allowlist; no identifiers, targets, event time or machine ID. Fold-local preprocessing. Random stratified split is an in-dataset benchmark, not temporal validation.',
        'limitations':['Synthetic milling conditions; no real factory validation.','No reliable machine identity, timestamped run-to-failure sequence or defined prediction horizon.','Generation formulas create separable labels and can inflate apparent performance.','Random-walk temperatures and wear cycles create dependencies; random splits may be optimistic for deployment.','RNF counts and mode-union labels in CSV can differ from narrative documentation; empirical labels remain unchanged.','Rare mode metrics have high sampling uncertainty.'],
        'cleaning':'No raw rows or labels changed. Original labels retained; canonical renaming only. Imputation fitted inside training folds for robustness.'}
    write_json(ROOT/'reports/data_quality_report.json',report)
    if any(invalid.values()) or any(invalid_labels.values()):
        raise ValueError('Invalid training values found; consult data_quality_report.json')
    return report

def distribution_profile(X):
    result = {}
    for c in NUMERIC:
        v=X[c]
        q1,q3=v.quantile([.25,.75])
        result[c]={'min':float(v.min()),'max':float(v.max()),'q01':float(v.quantile(.01)),'q99':float(v.quantile(.99)),'q1':float(q1),'q3':float(q3),'median':float(v.median()),'mean':float(v.mean()),'std':float(v.std()),'iqr':float(q3-q1)}
    result['product_type']={'proportions':X.product_type.value_counts(normalize=True).to_dict()}
    return result
