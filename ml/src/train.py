"""Reproducible training, validation selection, and a single frozen test evaluation."""
import argparse
import importlib.metadata
import importlib.util
import platform
import time
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.calibration import CalibratedClassifierCV, CalibrationDisplay
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import ConfusionMatrixDisplay, RocCurveDisplay, PrecisionRecallDisplay
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split, cross_validate
from .common import ROOT, config, log_event, read_json, sha256, stage, utc_now, write_json, log_error
from .data_validation import load_dataset, inspect_data, distribution_profile
from .feature_engineering import FEATURES, NUMERIC, DERIVED, MODES, TARGETS, make_pipeline
from .evaluate import binary_metrics, select_threshold, bootstrap_intervals
from .failure_mode_model import FailureModeComponent
from .anomaly_detection import AnomalyComponent
from .explain import local_contributions, shap_explanations
from .condition_engine import condition_evidence

FIG = ROOT/'reports/figures'
METRICS = ROOT/'reports/metrics'
SCORING = {'pr_auc':'average_precision','roc_auc':'roc_auc','recall':'recall','precision':'precision','f1':'f1','balanced_accuracy':'balanced_accuracy','neg_brier_score':'neg_brier_score'}

def savefig(name):
    plt.tight_layout()
    plt.savefig(FIG/name,dpi=160,bbox_inches='tight')
    plt.close()

def compact(metrics):
    return {k:v for k,v in metrics.items() if isinstance(v,(int,float,str))}

def plot_data(df):
    sns.set_theme(style='whitegrid',palette='deep')
    plt.figure(figsize=(9,4))
    counts=df[TARGETS].sum()
    sns.barplot(x=counts.index,y=counts.values,color='#2563eb')
    plt.title('Failure labels in the original synthetic dataset');plt.ylabel('Positive observations');plt.xlabel('Failure label')
    savefig('target_distributions.png')
    fig,axes=plt.subplots(2,3,figsize=(13,7))
    for c,ax in zip(NUMERIC,axes.flat):
        sns.histplot(data=df,x=c,hue='Machine failure',bins=35,ax=ax,element='step',stat='count')
    axes.flat[-1].axis('off')
    savefig('numeric_feature_distributions.png')
    plt.figure(figsize=(10,8))
    sns.heatmap(df[NUMERIC+TARGETS].corr(),cmap='coolwarm',center=0,vmin=-1,vmax=1)
    plt.title('Sensor and target correlations (descriptive only)')
    savefig('correlation_matrix.png')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reproduce',action='store_true',help='Explicitly repeat the same seeded benchmark; the test set has already been disclosed.')
    args=parser.parse_args()
    if (ROOT/'models/model_metadata.json').exists() and not args.reproduce:
        raise RuntimeError('Existing evaluated model detected. Use --reproduce for an explicit deterministic repeat; obtain new holdout data for fresh development.')
    started=time.perf_counter();cfg=config('training');seed=cfg['seed']
    np.random.seed(seed)
    with stage('data_inspection_and_split'):
        df=load_dataset();quality=inspect_data(df)
        indices=np.arange(len(df))
        development,test=train_test_split(indices,test_size=cfg['test_fraction'],stratify=df['Machine failure'],random_state=seed)
        train,validation=train_test_split(development,test_size=cfg['validation_fraction']/(1-cfg['test_fraction']),stratify=df.iloc[development]['Machine failure'],random_state=seed)
        splits={'train':train,'validation':validation,'test':test}
        write_json(ROOT/'data/processed/split_indices.json',{k:v.tolist() for k,v in splits.items()})
        for name,ids in splits.items():
            df.iloc[ids][FEATURES+TARGETS].assign(original_row_index=ids).to_csv(ROOT/f'data/processed/{name}.csv',index=False)
        X_train=df.iloc[train][FEATURES];y_train=df.iloc[train]['Machine failure']
        X_val=df.iloc[validation][FEATURES];y_val=df.iloc[validation]['Machine failure']
        profile=distribution_profile(X_train)
        baseline={c:float(X_train[c].median()) for c in NUMERIC};baseline['product_type']=str(X_train.product_type.mode()[0])
        log_event('training.log',stage='data_configuration',sha256=sha256(ROOT/'data/raw/ai4i2020.csv'),seed=seed,split_sizes={k:len(v) for k,v in splits.items()},preprocessing='Fold-local raw median/mode imputation, 3 derived features, fixed L/M/H one-hot. Scaling only logistic regression.',configuration=cfg)
    cv=StratifiedKFold(n_splits=cfg['cv_folds'],shuffle=True,random_state=seed)
    candidates={
        'dummy':make_pipeline(DummyClassifier(strategy='prior')),
        'logistic_regression':make_pipeline(LogisticRegression(class_weight='balanced',max_iter=3000,random_state=seed),scale=True),
        'random_forest':make_pipeline(RandomForestClassifier(n_estimators=200,min_samples_leaf=2,max_features=.8,class_weight='balanced_subsample',n_jobs=cfg['n_jobs'],random_state=seed)),
        'hist_gradient_boosting':make_pipeline(HistGradientBoostingClassifier(max_iter=160,max_leaf_nodes=15,l2_regularization=1,class_weight='balanced',early_stopping=False,random_state=seed))}
    if importlib.util.find_spec('xgboost'):
        try:
            from xgboost import XGBClassifier
            candidates['xgboost']=make_pipeline(XGBClassifier(n_estimators=180,max_depth=3,learning_rate=.06,subsample=.9,colsample_bytree=.9,scale_pos_weight=float((y_train==0).sum()/y_train.sum()),eval_metric='logloss',tree_method='hist',n_jobs=cfg['n_jobs'],random_state=seed))
        except Exception as exc:
            log_error('optional_xgboost',exc)
    cv_rows=[];comparison=[];fitted={};validation_probabilities={};threshold_tables={}
    with stage('baseline_cross_validation'):
        for name,pipeline in candidates.items():
            begin=time.perf_counter()
            # Outer CV serial: each tree estimator uses only two CPU workers.
            scores=cross_validate(pipeline,X_train,y_train,cv=cv,scoring=SCORING,n_jobs=1,error_score='raise')
            row={'candidate':name}
            for metric in SCORING:
                arr=scores[f'test_{metric}']
                row[f'cv_{metric}_mean']=float(np.mean(arr));row[f'cv_{metric}_std']=float(np.std(arr,ddof=1))
                for fold,value in enumerate(arr):cv_rows.append({'candidate':name,'fold':fold,'metric':metric,'value':float(value),'source':'stratified_training_cv'})
            pipeline.fit(X_train,y_train);fitted[name]=pipeline
            p=pipeline.predict_proba(X_val)[:,1];validation_probabilities[name]=p
            selection,table=select_threshold(y_val,p,cfg);threshold_tables[name]=table
            row.update({'validation_'+k:v for k,v in compact(binary_metrics(y_val,p,selection['threshold'])).items()})
            row.update({'validation_cost':selection['cost'],'selected_threshold':selection['threshold'],'fit_seconds':time.perf_counter()-begin})
            comparison.append(row)
            log_event('training.log',stage='candidate_complete',**row,parameters=str(pipeline.get_params(deep=True)))
            print(name, 'CV AP',round(row['cv_pr_auc_mean'],4),'validation cost',row['validation_cost'],flush=True)
    eligible=[r for r in comparison if r['candidate']!='dummy']
    strongest=sorted(eligible,key=lambda r:r['cv_pr_auc_mean'],reverse=True)[:2]
    grids={
        'random_forest':{'model__min_samples_leaf':[1,3],'model__max_features':[.7,1.]},
        'hist_gradient_boosting':{'model__max_leaf_nodes':[7,15],'model__l2_regularization':[1.,5.]},
        'xgboost':{'model__max_depth':[2,4],'model__min_child_weight':[1,5]},
        'logistic_regression':{'model__C':[.1,.5,2.,10.]}}
    with stage('bounded_tuning_and_train_only_calibration'):
        for item in strongest:
            base=item['candidate'];name=base+'_tuned'
            search=GridSearchCV(candidates[base],grids[base],scoring=SCORING,refit='pr_auc',cv=cv,n_jobs=1,error_score='raise',return_train_score=False)
            search.fit(X_train,y_train)
            pd.DataFrame(search.cv_results_).to_csv(METRICS/f'{base}_search.csv',index=False)
            pipeline=search.best_estimator_;fitted[name]=pipeline
            p=pipeline.predict_proba(X_val)[:,1];validation_probabilities[name]=p
            selection,table=select_threshold(y_val,p,cfg);threshold_tables[name]=table
            row={'candidate':name,'validation_cost':selection['cost'],'selected_threshold':selection['threshold'],'search_best_params':str(search.best_params_)}
            for metric in SCORING:
                row[f'cv_{metric}_mean']=float(search.cv_results_[f'mean_test_{metric}'][search.best_index_])
                vals=[float(search.cv_results_[f'split{fold}_test_{metric}'][search.best_index_]) for fold in range(cfg['cv_folds'])]
                row[f'cv_{metric}_std']=float(np.std(vals,ddof=1))
                for fold,value in enumerate(vals):cv_rows.append({'candidate':name,'fold':fold,'metric':metric,'value':value,'source':'selected_hyperparameters_non_nested_cv'})
            row.update({'validation_'+k:v for k,v in compact(binary_metrics(y_val,p,selection['threshold'])).items()});comparison.append(row)
            calibrated=CalibratedClassifierCV(estimator=pipeline,method=cfg['calibration'],cv=cv,ensemble=False,n_jobs=1)
            calibrated.fit(X_train,y_train)
            cname=name+'_sigmoid';fitted[cname]=calibrated
            cp=calibrated.predict_proba(X_val)[:,1];validation_probabilities[cname]=cp
            selection,table=select_threshold(y_val,cp,cfg);threshold_tables[cname]=table
            crow={'candidate':cname,'validation_cost':selection['cost'],'selected_threshold':selection['threshold'],'cv_source':name+' (underlying classifier; calibrated wrapper assessed on validation)'}
            crow.update({'validation_'+k:v for k,v in compact(binary_metrics(y_val,cp,selection['threshold'])).items()});comparison.append(crow)
            log_event('training.log',stage='tuned_candidate',candidate=name,parameters=search.best_params_,cv_pr_auc=row['cv_pr_auc_mean'],validation_cost=row['validation_cost'],calibrated_validation_cost=crow['validation_cost'])
            print(name,'CV AP',round(row['cv_pr_auc_mean'],4),'validation cost',row['validation_cost'],'calibrated',crow['validation_cost'],flush=True)
    # All selection happens before accessing test predictors or test labels below.
    selected=min([r for r in comparison if r['candidate']!='dummy'],key=lambda r:(r['validation_cost'],-r['validation_f1'],-r['validation_pr_auc'],r['validation_brier_score']))
    name=selected['candidate'];model=fitted[name];threshold=float(selected['selected_threshold'])
    selection_method='Minimize validation 5*FN + 1*FP subject to recall >= 0.80; tie-break by F1, average precision, then Brier score. Hyperparameter grids chosen using training CV AP. Costs are unapproved pilot assumptions.'
    threshold_record={'threshold':threshold,'selected_candidate':name,'method':selection_method,'false_negative_cost':cfg['false_negative_cost'],'false_positive_cost':cfg['false_positive_cost'],'minimum_validation_recall':cfg['minimum_validation_recall'],'selection_data':'validation only','selected_at_utc':utc_now()}
    with stage('freeze_selection_and_fit_auxiliary_components'):
        write_json(ROOT/'models/threshold.json',threshold_record)
        write_json(METRICS/'selection_decision_before_test.json',{'selected_candidate':name,'selection_method':selection_method,'candidate_result':selected,'test_labels_used_for_selection':False,'frozen_at_utc':utc_now()})
        pd.DataFrame(comparison).to_csv(METRICS/'model_comparison.csv',index=False)
        pd.DataFrame(cv_rows).to_csv(METRICS/'cross_validation.csv',index=False)
        threshold_tables[name].to_csv(METRICS/'validation_threshold_search.csv',index=False)
        val_metrics=binary_metrics(y_val,validation_probabilities[name],threshold)
        write_json(METRICS/'validation_metrics.json',val_metrics)
        mode_component=FailureModeComponent(seed,cfg['min_mode_train_positives']).fit(X_train,df.iloc[train][MODES],X_val,df.iloc[validation][MODES],cfg)
        anomaly=AnomalyComponent(seed,cfg['anomaly_contamination']).fit(X_train.loc[y_train==0])
        joblib.dump(model,ROOT/'models/model_pipeline.joblib')
        joblib.dump(mode_component,ROOT/'models/failure_mode_pipeline.joblib')
        joblib.dump(anomaly,ROOT/'models/anomaly_model.joblib')
        write_json(ROOT/'models/training_profile.json',profile)
        write_json(ROOT/'models/explanation_baseline.json',baseline)
        write_json(METRICS/'failure_mode_validation_metrics.json',mode_component.validation_metrics_)
    with stage('validation_explainability'):
        importance=permutation_importance(model,X_val,y_val,n_repeats=cfg['permutation_repeats'],random_state=seed,scoring='average_precision',n_jobs=1)
        global_importance=pd.DataFrame({'feature':FEATURES,'mean_ap_decrease':importance.importances_mean,'std_ap_decrease':importance.importances_std}).sort_values('mean_ap_decrease',ascending=False)
        global_importance.to_csv(METRICS/'global_feature_importance.csv',index=False)
        plt.figure(figsize=(8,4));plt.barh(global_importance.feature[::-1],global_importance.mean_ap_decrease[::-1],xerr=global_importance.std_ap_decrease[::-1],color='#2563eb');plt.xlabel('Validation average precision decrease');plt.title('Global permutation importance (raw inputs)');savefig('feature_importance.png')
        examples=pd.DataFrame([{'product_type':'L','air_temperature':298.1,'process_temperature':308.6,'rotational_speed':1450.,'torque':45.,'tool_wear':120.},{'product_type':'L','air_temperature':302.,'process_temperature':310.,'rotational_speed':1300.,'torque':65.,'tool_wear':220.}])[FEATURES]
        write_json(METRICS/'local_explanations.json',[{'input':row.to_dict(),'features':local_contributions(model,examples.iloc[[i]],baseline)} for i,(_,row) in enumerate(examples.iterrows())])
        write_json(METRICS/'shap_explanations.json',shap_explanations(model,X_train.sample(12,random_state=seed),examples))
    with stage('single_frozen_test_evaluation'):
        X_test=df.iloc[test][FEATURES];y_test=df.iloc[test]['Machine failure']
        p=model.predict_proba(X_test)[:,1]
        test_metrics=binary_metrics(y_test,p,threshold)
        test_metrics['bootstrap_95_percent']=bootstrap_intervals(y_test,p,threshold,seed)
        write_json(METRICS/'test_metrics.json',test_metrics)
        by_type={}
        for typ in ['L','M','H']:
            mask=X_test.product_type==typ
            by_type[typ]=binary_metrics(y_test.loc[mask],p[mask.to_numpy()],threshold)
            by_type[typ]['caution']='Small positive support; descriptive subgroup metric, not proven fairness or domain transfer.'
        write_json(METRICS/'test_metrics_by_product_type.json',by_type)
        predictions=X_test.copy();predictions.insert(0,'original_row_index',test)
        predictions['actual_failure']=y_test.to_numpy();predictions['failure_probability']=p;predictions['predicted_failure']=(p>=threshold).astype(int)
        mode_metrics={};mode_ps=mode_component.probabilities(X_test)
        all_evidence=[condition_evidence(row) for row in X_test.to_dict(orient='records')]
        for mode in MODES:
            ymode=df.iloc[test][mode]
            if mode in mode_ps:
                mp=mode_ps[mode];mt=mode_component.thresholds_[mode]
                mm=binary_metrics(ymode,mp,mt);mm['component']='independent_random_forest_uncalibrated_probability'
            elif mode=='RNF':
                mp=np.full(len(test),mode_component.prevalence_[mode]);mt=.5
                mm=binary_metrics(ymode,mp,mt);mm['component']='constant_training_base_rate_baseline_no_sensor_model'
            else:
                mp=np.array([float(next(e for e in es if e['mode']==mode)['triggered']) for es in all_evidence]);mt=.5
                mm=binary_metrics(ymode,mp,mt);mm['component']='wear_interval_context_indicator_not_validated_probability'
            mm['train_positives']=mode_component.support_[mode]
            mm['statistical_limit']='Rare positive counts; exploratory metrics only. Condition indicators and base rates are not personalized probabilities.'
            mode_metrics[mode]=mm
            predictions[f'actual_{mode}']=ymode.to_numpy();predictions[f'score_{mode}']=mp
        raw,percentile,flag=anomaly.score(X_test)
        predictions['anomaly_raw_score']=raw;predictions['anomaly_score']=percentile;predictions['is_anomaly']=flag
        predictions.to_csv(METRICS/'test_predictions.csv',index=False)
        write_json(METRICS/'failure_mode_metrics.json',mode_metrics)
        pd.DataFrame([{'mode':m,**compact(v),**v['confusion_matrix']} for m,v in mode_metrics.items()]).to_csv(METRICS/'failure_mode_metrics.csv',index=False)
        pd.DataFrame([{'split':'validation',**compact(val_metrics),**val_metrics['confusion_matrix']},{'split':'test',**compact(test_metrics),**test_metrics['confusion_matrix']}]).to_csv(METRICS/'overall_metrics.csv',index=False)
        write_json(METRICS/'anomaly_metrics.json',{'normal_training_count':anomaly.n_normal_training_,'contamination':cfg['anomaly_contamination'],'test_anomaly_rate':float(flag.mean()),'failure_recall_as_novelty_flag':float(flag[y_test.to_numpy()==1].mean()),'normal_false_alert_rate':float(flag[y_test.to_numpy()==0].mean()),'score_meaning':'Raw score is negative IsolationForest.score_samples (higher = more unusual). Display score is empirical percentile among normal training scores, not a failure probability. is_anomaly uses fitted contamination threshold.'})
        ConfusionMatrixDisplay.from_predictions(y_test,p>=threshold,display_labels=['No failure','Failure'],cmap='Blues');plt.title('Untouched test: overall failure');savefig('confusion_matrix.png')
        RocCurveDisplay.from_predictions(y_test,p);plt.title('Untouched test ROC');savefig('roc_curve.png')
        PrecisionRecallDisplay.from_predictions(y_test,p);plt.axhline(y_test.mean(),ls='--',color='gray',label='Prevalence');plt.legend();plt.title('Untouched test precision-recall');savefig('precision_recall_curve.png')
        CalibrationDisplay.from_predictions(y_test,p,n_bins=8,strategy='quantile');plt.title('Test probability reliability (quantile bins)');savefig('calibration_curve.png')
        display=pd.DataFrame({m:{k:v[k] for k in ['precision','recall','f1']} for m,v in mode_metrics.items()}).T
        display.plot.bar(figsize=(9,4),ylim=(0,1.05));plt.title('Per-mode test metrics; TWF context / RNF base-rate only');plt.ylabel('Score');savefig('failure_mode_results.png')
        plt.figure(figsize=(9,4));sns.histplot(x=raw,hue=y_test.to_numpy(),bins=35,element='step');plt.xlabel('Negative Isolation Forest score_samples');plt.title('Test anomaly scores by observed failure label');savefig('anomaly_score_distribution.png')
        plot_data(df)
        log_event('training.log',stage='frozen_test_result',selected_candidate=name,threshold=threshold,metrics=test_metrics)
    with stage('metadata_and_integrity_manifest'):
        underlying=model.calibrated_classifiers_[0].estimator if isinstance(model,CalibratedClassifierCV) else model
        metadata={'model_version':f'ai4i-pilot-1.0.0-{utc_now()[:10]}','created_at_utc':utc_now(),'selected_model':name,'estimator_class':type(model).__name__,
                  'prediction_target':'Machine failure under supplied operating condition','prediction_horizon':None,'remaining_useful_life':False,'factory_approved':False,
                  'dataset':read_json(ROOT/'data/raw/manifest.json'),'features':FEATURES,'derived_features':DERIVED,'transformed_features':underlying.named_steps['preprocess'].get_feature_names_out().tolist(),
                  'training_config':cfg,'split_sizes':{k:len(v) for k,v in splits.items()},'seed':seed,'selection_method':selection_method,
                  'selected_candidate_result':selected,'python_version':platform.python_version(),'dependencies':{p:importlib.metadata.version(p) for p in ['numpy','pandas','scikit-learn','joblib','scipy','fastapi','pydantic']},
                  'calibration':'train-only cross-validated sigmoid' if isinstance(model,CalibratedClassifierCV) else 'uncalibrated; calibrated candidates compared on validation',
                  'fit_data':'6000 training rows only. Validation used for selection, never final refit. Test accessed after freeze.',
                  'mode_training_support':mode_component.support_,'mode_models':list(mode_component.models_),'test_evaluation_completed_at_utc':utc_now(),
                  'reproduction_of_disclosed_test':args.reproduce,'training_duration_seconds':time.perf_counter()-started,
                  'limitations':quality['limitations'],'anomaly':read_json(METRICS/'anomaly_metrics.json')}
        write_json(ROOT/'models/model_metadata.json',metadata)
        files=['model_pipeline.joblib','failure_mode_pipeline.joblib','anomaly_model.joblib','threshold.json','model_metadata.json','training_profile.json','explanation_baseline.json']
        write_json(ROOT/'models/artifact_manifest.json',{'hash_algorithm':'sha256','files':{f:sha256(ROOT/'models'/f) for f in files},'trust_notice':'Integrity checks detect accidental changes; use signed artifacts and trusted deployment storage against malicious replacement. Never load untrusted joblib files.'})
        log_event('training.log',stage='training_complete',duration_seconds=time.perf_counter()-started,model=name,threshold=threshold,artifact_paths=[str(ROOT/'models'/f) for f in files])
        print('SELECTED',name,'THRESHOLD',threshold,flush=True)
        print('TEST',compact(test_metrics),test_metrics['confusion_matrix'],flush=True)

if __name__=='__main__':
    with stage('training_pipeline'):
        main()
