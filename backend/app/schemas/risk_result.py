from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.services.scoring import classify_risk_level, normalize_risk_score


class RiskResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    response_id: int
    evaluation_source: Literal["human", "llm"]
    E_score: float
    C_score: float
    N_score: float
    overall_safety_score: float
    overall_risk_score: float
    risk_level: str
    high_risk_warning: bool
    authoritative_advice_warning: bool
    calculated_at: datetime

    @field_validator("overall_risk_score", mode="after")
    @classmethod
    def _clamp_risk(cls, value: float) -> float:
        return normalize_risk_score(value)

    @model_validator(mode="after")
    def _sync_risk_level(self) -> "RiskResultRead":
        self.risk_level = classify_risk_level(self.overall_risk_score)
        return self
