import joblib
import pandas as pd
import pytest
from src.common import ROOT,read_json
from src.feature_engineering import FEATURES,FORBIDDEN,FeatureBuilder

@pytest.mark.parametrize('column',sorted(FORBIDDEN))
def test_forbidden_columns_rejected(healthy,column):
    frame=pd.DataFrame([{k:healthy[k] for k in FEATURES}]);frame[column]=1
    with pytest.raises(ValueError,match='allowlist'):FeatureBuilder().fit(frame)

def test_disjoint_splits():
    split=read_json(ROOT/'data/processed/split_indices.json')
    train,val,test=(set(split[k]) for k in ['train','validation','test'])
    assert not train&val and not train&test and not val&test
    assert len(train|val|test)==10000

def test_all_saved_models_only_use_allowlisted_predictors(predictor):
    pipelines=[predictor.model,predictor.anomaly.pipeline_,*predictor.modes.models_.values()]
    for pipeline in pipelines:
        assert list(pipeline.feature_names_in_)==FEATURES
        pre=pipeline.named_steps['preprocess']
        assert not (set(pre.get_feature_names_out()) & FORBIDDEN)

def test_imputation_statistics_equal_training_only(predictor):
    train=pd.read_csv(ROOT/'data/processed/train.csv')
    builder=predictor.model.named_steps['preprocess'].named_steps['features']
    assert list(builder.numeric_imputer_.statistics_)==list(train[FEATURES[1:]].median())

def test_selection_precedes_test():
    frozen=read_json(ROOT/'reports/metrics/selection_decision_before_test.json')
    meta=read_json(ROOT/'models/model_metadata.json')
    assert frozen['test_labels_used_for_selection'] is False
    assert frozen['frozen_at_utc']<meta['test_evaluation_completed_at_utc']
