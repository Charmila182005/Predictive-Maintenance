"""Single and batch prediction CLI using the identical serialized preprocessing."""
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import time
import uuid
import joblib
import numpy as np
import pandas as pd
from pydantic import ValidationError
from .common import ROOT, config, read_json, sha256, log_event, log_error, utc_now, write_json
from .feature_engineering import FEATURES, NUMERIC, UNITS, derive_values
from .condition_engine import condition_evidence
from .explain import LocalExplainer
from .recommendation_engine import recommend
from .schemas import SensorReading, PredictionResult
from .adapters import parse_csv

def log_validation_failure(exc, source='inference'):
    fields=[];missing=0
    if isinstance(exc,ValidationError):
        for error in exc.errors(include_input=False,include_url=False):
            field=str(error['loc'][-1]) if error['loc'] else 'request'
            fields.append(field)
            if field in NUMERIC and error['type'] in {'missing','value_error'}: missing+=int(error['type']=='missing')
    log_event('inference.log',stage='input_validation',source=source,input_validation_result='invalid',invalid_fields=fields,missing_sensor_count=missing)

class Predictor:
    def __init__(self, model_dir=None):
        begin=time.perf_counter()
        self.model_dir=Path(model_dir or os.getenv('PM_MODEL_DIR',str(ROOT/'models')))
        manifest=read_json(self.model_dir/'artifact_manifest.json')
        for filename,expected in manifest['files'].items():
            if Path(filename).name!=filename: raise ValueError('Artifact manifest may only reference flat filenames')
            if sha256(self.model_dir/filename)!=expected: raise ValueError(f'Model artifact failed integrity verification: {filename}')
        self.metadata=read_json(self.model_dir/'model_metadata.json')
        for package in ['scikit-learn','numpy','joblib']:
            if importlib.metadata.version(package)!=self.metadata['dependencies'][package]:
                raise RuntimeError(f'{package} version differs from training; use the pinned environment')
        self.model=joblib.load(self.model_dir/'model_pipeline.joblib')
        self.modes=joblib.load(self.model_dir/'failure_mode_pipeline.joblib')
        self.anomaly=joblib.load(self.model_dir/'anomaly_model.joblib')
        self.profile=read_json(self.model_dir/'training_profile.json')
        self.baseline=read_json(self.model_dir/'explanation_baseline.json')
        self.explainer=LocalExplainer(self.model,self.baseline)
        self.threshold=float(os.getenv('PM_DECISION_THRESHOLD',read_json(self.model_dir/'threshold.json')['threshold']))
        if not np.isfinite(self.threshold) or not 0<=self.threshold<=1: raise ValueError('PM_DECISION_THRESHOLD must be finite in [0,1]')
        probe=pd.DataFrame([self.baseline])[FEATURES]
        self._probabilities=self.model.predict_proba(probe)
        if self._probabilities.shape!=(1,2) or not np.isfinite(self._probabilities).all(): raise RuntimeError('Model startup probe failed')
        log_event('inference.log',stage='model_loaded',model_version=self.metadata['model_version'],latency_ms=(time.perf_counter()-begin)*1000)

    def predict(self, payload):
        begin=time.perf_counter()
        try:
            reading=payload if isinstance(payload,SensorReading) else SensorReading.model_validate(payload)
        except ValidationError as exc:
            log_validation_failure(exc)
            raise
        values=reading.features();X=pd.DataFrame([values])[FEATURES]
        warnings=[];ood=[]
        multiplier=config('inference')['out_of_distribution_iqr_multiplier']
        for c in NUMERIC:
            profile=self.profile[c];value=values[c]
            if value<profile['min'] or value>profile['max']:
                ood.append(c);warnings.append(f'{c}={value:g} {UNITS[c]} is outside training range [{profile["min"]:g}, {profile["max"]:g}]. Risk may be unreliable.')
            elif value<profile['q1']-multiplier*profile['iqr'] or value>profile['q3']+multiplier*profile['iqr']:
                ood.append(c);warnings.append(f'{c} is far from the central training distribution. Review sensor and units.')
        if reading.production_state in {'idle','down'} or reading.rotational_speed==0:
            warnings.append('Idle/stopped operation is outside the modeled running-process context; do not interpret this risk as validated for that state.')
        if reading.process_temperature<reading.air_temperature:
            warnings.append('Process temperature below ambient is outside the AI4I generation context; verify units and operating state.')
        probability=float(self.model.predict_proba(X)[0,1])
        evidence=condition_evidence(values);modes=self.modes.rank(X,evidence)
        raw,score,flag=self.anomaly.score(X)
        factors,explanation_method=self.explainer.explain(X,config('inference')['explanation_top_k'])
        recommendations=recommend(probability,self.threshold,float(score[0]),modes,evidence,warnings)
        explanation='Failure risk under the supplied operating condition. '+('Tree SHAP contributions sum from the background baseline to this probability. Correlated raw and derived inputs can share credit; contributions do not prove physical causality.' if explanation_method.startswith('Tree SHAP') else 'Contributing factors compare this prediction with one input replaced by its training reference; effects are not additive and do not prove physical causality.')
        if any(e['triggered'] for e in evidence): explanation+=' AI4I-specific supporting conditions are listed separately.'
        output={'prediction_id':str(uuid.uuid4()),'prediction_timestamp':utc_now(),'model_version':self.metadata['model_version'],
                'machine_id':reading.machine_id,'event_timestamp':reading.event_timestamp,'production_state':reading.production_state,
                'validated_input':values,'units':UNITS,'derived_values':derive_values(values),'failure_probability':probability,
                'predicted_class':'failure' if probability>=self.threshold else 'no_failure','decision_threshold':self.threshold,
                'anomaly_score':float(score[0]),'anomaly_raw_score':float(raw[0]),'is_anomaly':bool(flag[0]),
                'anomaly_explanation':'Empirical unusualness percentile among normal training rows; not a failure probability. Novelty can occur without failure.',
                'likely_failure_modes':modes,'condition_evidence':evidence,'contributing_features':factors,
                'explanation_method':explanation_method,
                'explanation':explanation,'warnings':warnings,**recommendations,'latency_ms':(time.perf_counter()-begin)*1000}
        result=PredictionResult.model_validate(output).model_dump(mode='json')
        log_event('inference.log',stage='prediction',prediction_id=result['prediction_id'],machine_id=reading.machine_id,event_timestamp=reading.event_timestamp,
                  input_validation_result='valid',model_version=self.metadata['model_version'],risk_score=probability,output_class=result['predicted_class'],
                  health_status=result['health_status'],latency_ms=result['latency_ms'],out_of_distribution=ood,features=values)
        return result

def results_csv(results):
    flat=[]
    for r in results:
        flat.append({**r['validated_input'],'machine_id':r['machine_id'],'event_timestamp':r['event_timestamp'],
                     **{k:r[k] for k in ['prediction_id','prediction_timestamp','model_version','failure_probability','predicted_class','health_status','urgency','anomaly_score','is_anomaly','latency_ms']},
                     **r['derived_values'],'recommendation':' | '.join(r['recommended_maintenance_action']),
                     'warnings':' | '.join(r['warnings']),'prediction_json':json.dumps(r,allow_nan=False)})
    return pd.DataFrame(flat).to_csv(index=False)

def predict_batch(predictor,input_path,output_path):
    src=Path(input_path);dest=Path(output_path)
    if src.resolve()==dest.resolve(): raise ValueError('Output CSV must be a new file; input cannot be overwritten')
    if dest.exists(): raise FileExistsError(f'Output already exists: {dest}; choose a new CSV filename')
    cfg=config('inference')
    if src.stat().st_size>cfg['max_upload_bytes']: raise ValueError('CSV exceeds upload size limit')
    readings=parse_csv(src.read_text(encoding='utf-8-sig'),cfg['max_batch_rows'])
    results=[predictor.predict(r) for r in readings]
    dest.parent.mkdir(parents=True,exist_ok=True)
    with dest.open('x',encoding='utf-8',newline='') as f: f.write(results_csv(results))
    return results

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--type',dest='product_type',choices=['L','M','H'])
    for feature in NUMERIC: parser.add_argument('--'+feature.replace('_','-'),dest=feature,type=float)
    parser.add_argument('--json',dest='json_file');parser.add_argument('--csv',dest='csv_file');parser.add_argument('--output');parser.add_argument('--machine-id');parser.add_argument('--event-timestamp')
    args=parser.parse_args()
    try:
        predictor=Predictor()
        if args.csv_file:
            if not args.output: parser.error('--csv requires --output with a new CSV filename')
            results=predict_batch(predictor,args.csv_file,args.output)
            print(json.dumps({'rows':len(results),'output':str(Path(args.output).resolve())}))
            return
        payload=read_json(args.json_file) if args.json_file else {c:getattr(args,c) for c in FEATURES}
        if args.machine_id:payload['machine_id']=args.machine_id
        if args.event_timestamp:payload['event_timestamp']=args.event_timestamp
        result=predictor.predict(payload)
        if args.output:write_json(args.output,result)
        print(json.dumps(result,indent=2,allow_nan=False))
    except Exception as exc:
        log_error('cli_prediction',exc)
        print(f'Prediction rejected: {exc}',file=sys.stderr)
        sys.exit(2)

if __name__=='__main__': main()
