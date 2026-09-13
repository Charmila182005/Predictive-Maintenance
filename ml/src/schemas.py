"""Explicit prediction-time contract. Metadata never enters the feature matrix."""
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .feature_engineering import FEATURES

class SensorReading(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    product_type: Literal['L','M','H']
    air_temperature: float = Field(gt=0, le=1000000, description='Absolute air temperature in kelvin; broad pilot interface bound, training-range warnings apply')
    process_temperature: float = Field(gt=0, le=1000000, description='Absolute process temperature in kelvin; broad pilot interface bound, training-range warnings apply')
    rotational_speed: float = Field(ge=0, le=10000000, description='Rotational speed in rpm; broad pilot interface bound')
    torque: float = Field(ge=0, le=1000000000, description='Torque magnitude in Nm; broad pilot interface bound')
    tool_wear: float = Field(ge=0, le=1000000000, description='Accumulated tool wear in minutes; broad pilot interface bound')
    machine_id: str | None = Field(default=None, max_length=128, pattern=r'^[A-Za-z0-9_.: -]+$')
    event_timestamp: datetime | None = None
    production_state: Literal['running','idle','down','unknown'] | None = None

    @field_validator(*FEATURES[1:], mode='before')
    @classmethod
    def numeric_only(cls, value):
        if isinstance(value, bool) or not isinstance(value, (int,float)):
            raise ValueError('A finite numeric sensor reading is required; strings, booleans and null are not accepted')
        return value

    @field_validator('event_timestamp')
    @classmethod
    def timezone_required(cls, value):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError('event_timestamp must include a timezone, for example 2026-09-09T10:00:00Z')
        return value

    def features(self):
        return {name: getattr(self,name) for name in FEATURES}

class FailureModeResult(BaseModel):
    mode: str
    name: str
    probability: float | None = Field(default=None, ge=0, le=1)
    score: float = Field(ge=0, le=1)
    score_kind: str
    predicted_active: bool
    supporting_condition: bool
    limitation: str

class PredictionResult(BaseModel):
    prediction_id: str
    prediction_timestamp: datetime
    model_version: str
    machine_id: str | None
    event_timestamp: datetime | None
    production_state: str | None
    validated_input: dict[str, Any]
    units: dict[str,str]
    derived_values: dict[str,float]
    failure_probability: float = Field(ge=0,le=1)
    predicted_class: Literal['failure','no_failure']
    decision_threshold: float = Field(ge=0,le=1)
    health_status: Literal['Healthy','Warning','High Risk','Critical']
    risk_level: str
    urgency: str
    anomaly_score: float = Field(ge=0,le=1)
    anomaly_raw_score: float
    is_anomaly: bool
    anomaly_explanation: str
    likely_failure_modes: list[FailureModeResult]
    condition_evidence: list[dict[str,Any]]
    contributing_features: list[dict[str,Any]]
    explanation_method: str
    explanation: str
    recommended_maintenance_action: list[str]
    warnings: list[str]
    decision_support_notice: str
    latency_ms: float = Field(ge=0)

class OutcomeFeedback(BaseModel):
    model_config = ConfigDict(extra='forbid')
    prediction_id: str = Field(min_length=1,max_length=64)
    machine_id: str = Field(min_length=1,max_length=128)
    confirmed_failure: bool
    confirmed_modes: list[Literal['TWF','HDF','PWF','OSF','RNF']] = Field(default_factory=list)
    observed_at: datetime
    maintenance_action: str = Field(max_length=1000)
    reviewer: str = Field(min_length=1,max_length=128)

    @field_validator('observed_at')
    @classmethod
    def timezone_required(cls, value):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError('observed_at requires a timezone')
        return value
