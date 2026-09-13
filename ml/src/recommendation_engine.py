from .common import config

def recommend(probability, threshold, anomaly_score, modes, evidence, warnings):
    cfg = config('maintenance_rules')
    risk = cfg['risk']
    levels = [risk['warning_probability'],risk['high_probability'],risk['critical_probability']]
    if not 0 <= levels[0] <= levels[1] <= levels[2] <= 1:
        raise ValueError('Risk thresholds must be ordered within [0,1]')
    deterministic = {e['mode'] for e in evidence if e['triggered'] and e['kind']=='deterministic_dataset_condition'}
    if probability >= risk['critical_probability']:
        health, urgency = 'Critical', 'Immediate human review'
    elif probability >= threshold or probability >= risk['high_probability'] or deterministic:
        health, urgency = 'High Risk', 'Prompt maintenance review'
    elif probability >= risk['warning_probability'] or anomaly_score >= risk['anomaly_warning_percentile'] or warnings or any(m['predicted_active'] for m in modes):
        health, urgency = 'Warning', 'Review operating conditions'
    else:
        health, urgency = 'Healthy', 'Routine observation'
    selected = set(deterministic)
    if health != 'Healthy':
        selected.update(m['mode'] for m in modes if m['predicted_active'] or m['score'] >= risk['mode_attention_score'])
    actions = [cfg['actions'][m['mode']] for m in modes if m['mode'] in selected]
    if not actions:
        actions = [cfg['default_action'] if health=='Healthy' else cfg['generic_inspection']]
    return {'health_status':health,'risk_level':health,'urgency':urgency,'recommended_maintenance_action':actions,'decision_support_notice':cfg['notice']}
