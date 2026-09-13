import math
import numpy as np
import pandas as pd
import pytest
from src.feature_engineering import FeatureBuilder, FEATURES, derive_values, make_preprocessor
from src.condition_engine import condition_evidence

def test_required_calculations(healthy):
    d=derive_values(healthy)
    assert d['temperature_difference']==pytest.approx(10.5)
    assert d['mechanical_power_w']==pytest.approx(45*1450*2*math.pi/60)
    assert d['overstrain_measure']==5400

@pytest.mark.parametrize('typ,threshold',[('L',11000),('M',12000),('H',13000)])
def test_overstrain_strict_boundaries(healthy,typ,threshold):
    healthy.update(product_type=typ,tool_wear=200,torque=threshold/200)
    rule=lambda:next(r for r in condition_evidence(healthy) if r['mode']=='OSF')
    assert not rule()['triggered']
    healthy['torque']+=.001
    assert rule()['triggered']

def test_hdf_requires_both_conditions(healthy):
    healthy.update(air_temperature=300,process_temperature=308,rotational_speed=1380)
    rule=lambda:next(r for r in condition_evidence(healthy) if r['mode']=='HDF')
    assert not rule()['triggered']
    healthy['rotational_speed']=1379
    assert rule()['triggered']
    healthy['process_temperature']=309
    assert not rule()['triggered']

def test_imputation_fitted_on_training_and_derived_after(healthy):
    train=pd.DataFrame([{k:healthy[k] for k in FEATURES}]*3)
    train['torque']=[20.,40.,60.]
    transformer=FeatureBuilder().fit(train)
    val=train.iloc[[0]].copy();val['torque']=np.nan
    output=transformer.transform(val)
    assert output.torque.iloc[0]==40
    assert output.overstrain_measure.iloc[0]==4800
    assert transformer.numeric_imputer_.statistics_[3]==40

def test_unknown_category_safe_internal_pipeline(healthy):
    train=pd.DataFrame([{k:healthy[k] for k in FEATURES}])
    pre=make_preprocessor().fit(train)
    unknown=train.copy();unknown['product_type']='UNSEEN'
    output=pre.transform(unknown)
    assert output.shape==(1,11)
    assert np.array_equal(output[0,:3],[0,0,0])
