"""Pilot monitoring hooks; aggregate externally for multi-worker deployments."""
from collections import Counter
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp
from .common import ROOT, log_event, read_json, write_json
from .feature_engineering import NUMERIC
from .schemas import OutcomeFeedback

def record_feedback(payload):
    feedback=OutcomeFeedback.model_validate(payload)
    log_event('feedback.jsonl',stage='confirmed_outcome',**feedback.model_dump(mode='json'))
    return {'status':'recorded','prediction_id':feedback.prediction_id,'retraining_triggered':False}

def feature_drift(reference, current):
    """Two-sample KS hook. Inspect effect size and context, not p-values alone."""
    result={}
    for c in NUMERIC:
        a=pd.to_numeric(reference[c],errors='coerce').dropna()
        b=pd.to_numeric(current[c],errors='coerce').dropna()
        if len(a)<20 or len(b)<20:
            result[c]={'status':'insufficient_samples','n_reference':len(a),'n_current':len(b)}
        else:
            test=ks_2samp(a,b)
            result[c]={'ks_statistic':float(test.statistic),'p_value':float(test.pvalue),'n_reference':len(a),'n_current':len(b),'review_flag':bool(test.statistic>.2)}
    if 'product_type' in reference and 'product_type' in current:
        a=reference.product_type.value_counts(normalize=True);b=current.product_type.value_counts(normalize=True)
        result['product_type']={'total_variation_distance':float(sum(abs(a.get(k,0)-b.get(k,0)) for k in set(a.index)|set(b.index))/2)}
    return result

def monitoring_summary(path=None):
    if path is None:
        import os
        path=Path(os.getenv('PM_LOG_DIR',str(ROOT/'logs')))/'inference.log'
    path=Path(path)
    if not path.exists(): return {'prediction_count':0,'schema_failure_count':0,'status':'no_events'}
    # Bounded tail: pilot log inspection only, use a log collector/metrics backend at scale.
    with path.open('rb') as stream:
        stream.seek(0,2);size=stream.tell();start=max(0,size-5_000_000);stream.seek(start)
        if start: stream.readline()
        lines=stream.read().decode('utf-8',errors='replace').splitlines()[-10000:]
    events=[];malformed=0
    for line in lines:
        try: events.append(json.loads(line))
        except json.JSONDecodeError: malformed+=1
    success=[e for e in events if e.get('stage')=='prediction' and e.get('input_validation_result')=='valid']
    rejected=[e for e in events if e.get('stage')=='input_validation' and e.get('input_validation_result')=='invalid']
    latency=[e['latency_ms'] for e in success]
    probs=[e['risk_score'] for e in success]
    missing=sum(e.get('missing_sensor_count',0) for e in rejected)
    total=len(success)+len(rejected)
    profile={'events_observed':total,'prediction_count':len(success),'schema_failure_count':len(rejected),'schema_failure_rate':len(rejected)/max(total,1),
             'missing_sensor_rate':missing/max(total*len(NUMERIC),1),'out_of_distribution_rate':sum(bool(e.get('out_of_distribution')) for e in success)/max(len(success),1),
             'failure_alert_rate':sum(e['output_class']=='failure' for e in success)/max(len(success),1),
             'latency_ms':{'p50':float(np.percentile(latency,50)),'p95':float(np.percentile(latency,95)),'max':float(max(latency))} if latency else None,
             'prediction_probability_histogram':np.histogram(probs,bins=np.linspace(0,1,11))[0].tolist(),
             'malformed_log_lines':malformed,'scope':'Last 10000 lines / 5 MB in this worker log. Alert rates are model outputs, not confirmed outcomes.'}
    if success and (ROOT/'data/processed/train.csv').exists():
        current=pd.DataFrame([e['features'] for e in success if 'features' in e])
        reference=pd.read_csv(ROOT/'data/processed/train.csv')
        if len(current):profile['feature_drift']=feature_drift(reference,current)
    feedback_path=path.parent/'feedback.jsonl'
    profile['feedback_available']=feedback_path.exists()
    return profile

def prediction_drift(reference_probabilities,current_probabilities):
    if len(reference_probabilities)<20 or len(current_probabilities)<20:
        return {'status':'insufficient_samples'}
    test=ks_2samp(reference_probabilities,current_probabilities)
    return {'ks_statistic':float(test.statistic),'p_value':float(test.pvalue),'review_flag':bool(test.statistic>.2)}

if __name__=='__main__':
    result=monitoring_summary();write_json(ROOT/'reports/metrics/monitoring_snapshot.json',result)
    print(json.dumps(result,indent=2))
