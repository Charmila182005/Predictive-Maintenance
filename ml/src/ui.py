"""Run with: python -m streamlit run src/ui.py --server.address 127.0.0.1"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import pandas as pd
import streamlit as st
from src.predict import Predictor
from src.common import log_error

st.set_page_config(page_title='Machine Health | Maintenance Pilot',page_icon='⚙️',layout='wide')
st.title('Machine health & maintenance')
st.caption('AI4I PILOT · OPERATING-CONDITION RISK · HUMAN REVIEW REQUIRED')

@st.cache_resource
def get_predictor(): return Predictor()

try: predictor=get_predictor()
except Exception as exc:
    log_error('ui_model_startup',exc)
    st.error(f'Models could not be loaded: {exc}. Run training and verify the artifact manifest.')
    st.stop()

with st.sidebar:
    st.subheader('Pilot scope')
    st.write('Synthetic milling data. Risk applies to the supplied readings; there is no time-to-failure estimate.')
    st.write('Factory calibration and human approval are required before acting on recommendations.')
    st.caption(f'Model: {predictor.metadata["model_version"]}')
    st.caption(f'Failure decision threshold: {predictor.threshold:.4f}')

with st.form('manual_readings'):
    st.subheader('Enter operating data')
    a,b,c=st.columns(3)
    product=a.selectbox('Product Type',['L','M','H'])
    air=b.number_input('Air Temperature (K)',min_value=0.01,value=298.1,step=.1,format='%.2f')
    process=c.number_input('Process Temperature (K)',min_value=0.01,value=308.6,step=.1,format='%.2f')
    speed=a.number_input('Rotational Speed (rpm)',min_value=0.,value=1450.,step=10.)
    torque=b.number_input('Torque (Nm)',min_value=0.,value=45.,step=1.)
    wear=c.number_input('Tool Wear (min)',min_value=0.,value=120.,step=1.)
    machine=st.text_input('Machine identifier (optional)',value='DEMO-001')
    submitted=st.form_submit_button('Assess machine condition',type='primary')

if submitted:
    try:
        with st.spinner('Assessing operating condition…'):
            result=predictor.predict({'product_type':product,'air_temperature':air,'process_temperature':process,'rotational_speed':speed,'torque':torque,'tool_wear':wear,'machine_id':machine or None})
        st.session_state['result']=result
        history=st.session_state.get('history',[])
        history.append({k:result[k] for k in ['prediction_timestamp','machine_id','failure_probability','health_status']})
        st.session_state['history']=history[-20:]
    except Exception as exc:
        log_error('ui_prediction',exc)
        st.error(f'Please correct the input: {exc}')

if 'result' in st.session_state:
    result=st.session_state['result']
    st.divider()
    a,b,c,d=st.columns(4)
    a.metric('Failure probability',f'{result["failure_probability"]:.1%}')
    b.metric('Machine health',result['health_status'])
    c.metric('Anomaly percentile',f'{result["anomaly_score"]:.1%}')
    d.metric('Predicted class',result['predicted_class'].replace('_',' ').title())
    st.subheader(result['urgency'])
    for action in result['recommended_maintenance_action']:st.write('• '+action)
    for warning in result['warnings']:st.warning(warning)
    tabs=st.tabs(['Failure modes & evidence','Contributing factors','Inputs & derived values','Prediction history','Full response'])
    with tabs[0]:
        st.caption('Evidence-supported modes appear first. Probabilities, context indicators, and base rates have different meanings; scores are not directly comparable.')
        st.dataframe(pd.DataFrame(result['likely_failure_modes']),hide_index=True,use_container_width=True)
        for evidence in result['condition_evidence']:
            with st.expander(f'{evidence["mode"]} · '+('Condition present' if evidence['triggered'] else 'No condition triggered')):
                st.write(evidence['rule']);st.json(evidence['measured']);st.caption(evidence['scope'])
    with tabs[1]:
        st.write(result['explanation'])
        st.dataframe(pd.DataFrame(result['contributing_features']),hide_index=True,use_container_width=True)
    with tabs[2]:
        st.dataframe(pd.DataFrame([{'parameter':k,'value':v,'unit':result['units'][k]} for k,v in {**result['validated_input'],**result['derived_values']}.items()]).astype({'value':str}),hide_index=True,use_container_width=True)
    with tabs[3]:
        st.caption('This session only. These are prediction timestamps, not a run-to-failure dataset.')
        st.dataframe(pd.DataFrame(st.session_state['history']),hide_index=True,use_container_width=True)
    with tabs[4]:st.json(result)
    st.caption(f'{result["model_version"]} · {result["prediction_timestamp"]} · {result["latency_ms"]:.1f} ms')
    st.info(result['decision_support_notice'])
else:
    st.info('Enter all six values and select Assess machine condition. The example is ready to run.')
