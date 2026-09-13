from streamlit.testing.v1 import AppTest
from src.common import ROOT

def test_manual_entry_ui_healthy_and_high_risk():
    app=AppTest.from_file(str(ROOT/'src/ui.py'),default_timeout=60).run()
    assert not app.exception
    app.button[0].click().run()
    assert not app.exception
    assert any(m.value=='Healthy' for m in app.metric)
    values={'Air Temperature (K)':302.,'Process Temperature (K)':310.,'Rotational Speed (rpm)':1300.,'Torque (Nm)':65.,'Tool Wear (min)':220.}
    for element in app.number_input:
        if element.label in values:element.set_value(values[element.label])
    app.button[0].click().run()
    assert not app.exception
    assert any(m.value in {'High Risk','Critical'} for m in app.metric)
