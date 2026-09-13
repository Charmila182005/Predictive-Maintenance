"""Global permutation importance and exact six-feature model-agnostic SHAP when available."""
import importlib.util
import numpy as np
import pandas as pd
from .feature_engineering import FEATURES
from .common import log_error

class LocalExplainer:
    """Tree SHAP for a compatible deployed tree pipeline; replacement fallback."""
    def __init__(self, model, baseline):
        self.model=model;self.baseline=baseline;self.explainer=None
        if hasattr(model,'named_steps') and type(model.named_steps['model']).__name__=='RandomForestClassifier' and importlib.util.find_spec('shap'):
            try:
                import shap
                self.explainer=shap.TreeExplainer(model.named_steps['model'],feature_perturbation='tree_path_dependent')
            except Exception as exc:log_error('runtime_tree_shap_initialization',exc)

    def explain(self,X,top_k=6):
        if self.explainer is not None:
            try:
                pre=self.model.named_steps['preprocess']
                transformed=pre.transform(X)
                values=np.asarray(self.explainer.shap_values(transformed,check_additivity=True))
                contributions=values[0,:,1] if values.ndim==3 else values[1][0]
                base=float(np.asarray(self.explainer.expected_value)[1])
                p=float(self.model.predict_proba(X)[0,1])
                if not np.isclose(base+contributions.sum(),p,atol=1e-6):raise ValueError('Tree SHAP probability additivity check failed')
                result=[{'feature':str(feature),'value':float(transformed[0,i]),'contribution':float(contributions[i]),
                         'direction':'increases risk' if contributions[i]>0 else 'decreases risk' if contributions[i]<0 else 'no measured change',
                         'units':'failure probability contribution','base_value':base} for i,feature in enumerate(pre.get_feature_names_out())]
                # Return every contribution so the displayed explanation remains additive.
                return sorted(result,key=lambda x:abs(x['contribution']),reverse=True),'Tree SHAP on deployed random-forest probability; additive across all transformed features'
            except Exception as exc:
                log_error('runtime_tree_shap_fallback',exc)
        return local_contributions(self.model,X,self.baseline,top_k),'single-feature training-reference replacement on deployed probability; non-additive'

def local_contributions(model, X, baseline, top_k=6):
    original=float(model.predict_proba(X)[0,1])
    variants=[]
    for feature in FEATURES:
        changed=X.copy()
        changed.loc[:,feature]=baseline[feature]
        variants.append(changed)
    scores=model.predict_proba(pd.concat(variants,ignore_index=True))[:,1]
    result=[{'feature':feature,'value':X.iloc[0][feature].item() if hasattr(X.iloc[0][feature],'item') else X.iloc[0][feature],
             'reference_value':baseline[feature], 'contribution':float(original-scores[i]),
             'direction':'increases risk' if original-scores[i]>0 else 'decreases risk' if original-scores[i]<0 else 'no measured change',
             'units':'failure probability difference on single-feature replacement'} for i,feature in enumerate(FEATURES)]
    return sorted(result,key=lambda x:abs(x['contribution']),reverse=True)[:top_k]

def shap_explanations(model, background, examples):
    """SHAP evaluates the deployed probability including any calibration wrapper.

    With six original features, 64 samples cover every coalition. Derived features
    are recalculated for every coalition by the saved pipeline.
    """
    if importlib.util.find_spec('shap') is None:
        return {'available':False,'reason':'SHAP not installed; global permutation and local reference replacement are available.'}
    try:
        import shap
        mapping={'L':0,'M':1,'H':2}
        def encode(df):
            tmp=df[FEATURES].copy();tmp['product_type']=tmp.product_type.map(mapping)
            return tmp.to_numpy(dtype=float)
        def probability(values):
            frame=pd.DataFrame(values,columns=FEATURES)
            frame['product_type']=frame.product_type.round().astype(int).map({0:'L',1:'M',2:'H'})
            return model.predict_proba(frame)[:,1]
        explainer=shap.KernelExplainer(probability,encode(background))
        values=np.asarray(explainer.shap_values(encode(examples),nsamples=64,l1_reg=0,silent=True))
        prediction=model.predict_proba(examples)[:,1]
        base=float(np.asarray(explainer.expected_value).item())
        residual=prediction-base-values.sum(axis=1)
        if not np.allclose(residual,0,atol=1e-6):
            raise ValueError(f'SHAP additivity verification failed: {residual}')
        return {'available':True,'method':'Kernel SHAP on deployed probability, all six-feature coalitions, 12 training background rows',
                'feature_names':FEATURES,'base_value':base,'contributions':values.tolist(),'predictions':prediction.tolist(),
                'max_additivity_error':float(np.max(np.abs(residual))),'inputs':examples.to_dict(orient='records'),
                'limitations':'Background-dependent associations, not physical causes. Correlated inputs create off-manifold coalitions. Runtime uses faster non-additive reference replacement.'}
    except Exception as exc:
        log_error('optional_shap_fallback',exc)
        return {'available':False,'reason':f'{type(exc).__name__}: {exc}','fallback':'Validation permutation importance and local single-feature reference replacement.'}
