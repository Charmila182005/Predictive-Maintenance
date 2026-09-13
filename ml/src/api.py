"""Versioned FastAPI pilot service with compatible unversioned endpoint aliases."""
from contextlib import asynccontextmanager
import hmac
import os
import uuid
from fastapi import FastAPI, Depends, File, Header, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from starlette.concurrency import run_in_threadpool
from .common import ROOT, config, log_error, log_event
from .schemas import SensorReading, PredictionResult, OutcomeFeedback
from .predict import Predictor, results_csv
from .adapters import parse_csv
from .monitoring import monitoring_summary, record_feedback

@asynccontextmanager
async def lifespan(app):
    try: app.state.predictor=await run_in_threadpool(Predictor)
    except Exception as exc:
        log_error('api_model_startup',exc)
        raise
    yield

app=FastAPI(title='Manufacturing Maintenance Pilot',version='1.0.0',description='Synthetic AI4I operating-condition risk. No future horizon or RUL. Decision support requiring factory validation.',lifespan=lifespan)

def authorize(x_api_key: str | None=Header(default=None)):
    expected=os.getenv('PM_API_KEY')
    if expected and (not x_api_key or not hmac.compare_digest(x_api_key,expected)):
        raise HTTPException(status_code=401,detail='A valid X-API-Key header is required')

@app.middleware('http')
async def request_size_limit(request: Request,call_next):
    length=request.headers.get('content-length')
    if length:
        try: size=int(length)
        except ValueError:return JSONResponse(status_code=400,content={'detail':'Invalid Content-Length'})
        if size>config('inference')['max_upload_bytes']+65536:
            return JSONResponse(status_code=413,content={'detail':'Request exceeds pilot upload limit'})
    return await call_next(request)

@app.exception_handler(RequestValidationError)
async def validation_error(request,exc):
    details=[];missing=0
    for e in exc.errors():
        details.append({'field':'.'.join(str(x) for x in e['loc']),'message':e['msg'],'type':e['type']})
        missing+=int(e['type']=='missing' or e.get('input','__not_null__') is None)
    log_event('inference.log',stage='input_validation',source='api',input_validation_result='invalid',invalid_fields=[e['field'] for e in details],missing_sensor_count=missing)
    log_error('api_input_validation',exc)
    return JSONResponse(status_code=422,content={'detail':details,'message':'Correct the sensor readings and units before retrying; no prediction was made.'})

@app.exception_handler(Exception)
async def unexpected_error(request,exc):
    log_error('api_unhandled',exc)
    return JSONResponse(status_code=500,content={'detail':'Prediction unavailable; consult the service error log.'})

@app.get('/health')
@app.get('/v1/health')
def health(request: Request):
    predictor=getattr(request.app.state,'predictor',None)
    if predictor is None:raise HTTPException(503,'Models not loaded')
    return {'status':'ok','models_loaded':True,'model_version':predictor.metadata['model_version'],'factory_approved':False}

@app.get('/model-info',dependencies=[Depends(authorize)])
@app.get('/v1/model-info',dependencies=[Depends(authorize)])
def model_info(request: Request):
    return {**request.app.state.predictor.metadata,'active_decision_threshold':request.app.state.predictor.threshold}

@app.post('/predict',response_model=PredictionResult,dependencies=[Depends(authorize)])
@app.post('/v1/predict',response_model=PredictionResult,dependencies=[Depends(authorize)])
def predict(reading: SensorReading,request: Request):
    return request.app.state.predictor.predict(reading)

@app.post('/predict-batch',dependencies=[Depends(authorize)],responses={200:{'content':{'text/csv':{}}}})
@app.post('/v1/predict-batch',dependencies=[Depends(authorize)],responses={200:{'content':{'text/csv':{}}}})
async def predict_batch(request: Request,file: UploadFile=File(...)):
    cfg=config('inference');body=await file.read(cfg['max_upload_bytes']+1)
    await file.close()
    if len(body)>cfg['max_upload_bytes']:raise HTTPException(413,'CSV exceeds upload size limit')
    try:readings=parse_csv(body.decode('utf-8-sig'),cfg['max_batch_rows'])
    except (ValueError,UnicodeError) as exc:
        log_error('api_batch_validation',exc)
        log_event('inference.log',stage='input_validation',source='api_batch',input_validation_result='invalid',missing_sensor_count=0)
        raise HTTPException(422,str(exc)) from exc
    def execute_batch():
        results=[request.app.state.predictor.predict(r) for r in readings]
        text=results_csv(results)
        batch_id=str(uuid.uuid4())
        directory=ROOT/'data/interim/batches';directory.mkdir(parents=True,exist_ok=True)
        with (directory/f'{batch_id}.csv').open('x',encoding='utf-8',newline='') as stream:stream.write(text)
        return text,batch_id
    text,batch_id=await run_in_threadpool(execute_batch)
    return Response(content=text,media_type='text/csv',headers={'Content-Disposition':f'attachment; filename="predictions-{batch_id}.csv"','X-Batch-ID':batch_id})

@app.get('/v1/monitoring',dependencies=[Depends(authorize)])
def monitoring():return monitoring_summary()

@app.post('/v1/feedback',dependencies=[Depends(authorize)])
def feedback(payload: OutcomeFeedback):return record_feedback(payload.model_dump())
