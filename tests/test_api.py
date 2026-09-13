import io
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from src.api import app
from src.common import ROOT

@pytest.fixture(scope='module')
def client():
    with TestClient(app) as value:yield value

@pytest.mark.parametrize('prefix',['','/v1'])
def test_all_required_endpoints(client,healthy,prefix):
    assert client.get(prefix+'/health').json()['models_loaded']
    assert client.get(prefix+'/model-info').status_code==200
    result=client.post(prefix+'/predict',json=healthy)
    assert result.status_code==200
    assert 0<=result.json()['failure_probability']<=1
    with (ROOT/'examples/batch_input.csv').open('rb') as f:
        response=client.post(prefix+'/predict-batch',files={'file':('readings.csv',f,'text/csv')})
    assert response.status_code==200
    assert len(pd.read_csv(io.StringIO(response.text)))==3
    assert (ROOT/'data/interim/batches'/f'{response.headers["X-Batch-ID"]}.csv').is_file()

def test_invalid_api_does_not_predict(client,healthy):
    healthy['torque']=None
    response=client.post('/v1/predict',json=healthy)
    assert response.status_code==422
    assert 'Correct the sensor readings' in response.json()['message']

def test_auth_key_enforced(client,healthy,monkeypatch):
    monkeypatch.setenv('PM_API_KEY','test-secret-not-for-deployment')
    assert client.post('/v1/predict',json=healthy).status_code==401
    assert client.post('/v1/predict',json=healthy,headers={'X-API-Key':'test-secret-not-for-deployment'}).status_code==200
    assert client.get('/health').status_code==200

def test_invalid_batch_atomic_rejection(client):
    text='product_type,air_temperature,process_temperature,rotational_speed,torque,tool_wear\nL,298,308,1500,40,100\nL,298,308,1500,,100\n'
    response=client.post('/predict-batch',files={'file':('bad.csv',text,'text/csv')})
    assert response.status_code==422
    assert 'row 3' in response.json()['detail']

def test_schema_docs_and_monitoring(client):
    schema=client.get('/openapi.json').json()
    assert 'SensorReading' in schema['components']['schemas']
    assert 'PredictionResult' in schema['components']['schemas']
    assert client.get('/v1/monitoring').status_code==200
