import numpy as np
import pandas as pd
import pytest
from pydantic import ValidationError
from src.schemas import SensorReading,PredictionResult
from src.feature_engineering import FEATURES
from src.predict import predict_batch
from src.common import ROOT

def test_healthy_and_high_risk(predictor,healthy,high_risk):
    a=predictor.predict(healthy);b=predictor.predict(high_risk)
    assert a['health_status']=='Healthy'
    assert b['health_status'] in {'High Risk','Critical'}
    assert a['failure_probability']<b['failure_probability']
    for result in [a,b]:
        PredictionResult.model_validate(result)
        assert len(result['likely_failure_modes'])==5
        assert 0<=result['failure_probability']<=1
        assert 0<=result['anomaly_score']<=1

@pytest.mark.parametrize('value',[None,'hot',float('inf'),float('nan'),-1,True,1e308])
def test_invalid_sensor_rejected(healthy,value):
    healthy['air_temperature']=value
    with pytest.raises(ValidationError):SensorReading.model_validate(healthy)

def test_missing_and_invalid_category(healthy):
    del healthy['torque']
    with pytest.raises(ValidationError):SensorReading.model_validate(healthy)
    healthy['torque']=30;healthy['product_type']='X'
    with pytest.raises(ValidationError):SensorReading.model_validate(healthy)

def test_out_of_distribution_warns(predictor,healthy):
    healthy['air_temperature']=280
    result=predictor.predict(healthy)
    assert any('outside training range' in w for w in result['warnings'])
    assert result['health_status']!='Healthy'

def test_metadata_not_predictive(predictor,healthy):
    a=predictor.predict(healthy)
    healthy['machine_id']='ANOTHER';healthy['event_timestamp']='2027-01-01T10:00:00Z'
    b=predictor.predict(healthy)
    assert a['failure_probability']==b['failure_probability']

def test_prediction_matches_saved_pipeline(predictor,healthy):
    X=pd.DataFrame([{k:healthy[k] for k in FEATURES}])
    p=predictor.model.predict_proba(X)[0,1]
    result=predictor.predict(healthy)
    assert p==pytest.approx(result['failure_probability'])
    if result['explanation_method'].startswith('Tree SHAP'):
        factors=result['contributing_features']
        assert factors[0]['base_value']+sum(f['contribution'] for f in factors)==pytest.approx(p,abs=1e-6)

def test_random_failure_has_no_sensor_probability(predictor,healthy):
    result=predictor.predict(healthy)
    rnf=next(m for m in result['likely_failure_modes'] if m['mode']=='RNF')
    assert rnf['probability'] is None
    assert rnf['predicted_active'] is False

def test_batch_matches_single_and_protects_input(predictor,tmp_path):
    source=ROOT/'examples/batch_input.csv'
    destination=tmp_path/'result.csv'
    result=predict_batch(predictor,source,destination)
    assert len(result)==3
    df=pd.read_csv(destination)
    assert np.allclose(df.failure_probability,[r['failure_probability'] for r in result])
    with pytest.raises(FileExistsError):predict_batch(predictor,source,destination)
    with pytest.raises(ValueError):predict_batch(predictor,source,source)
