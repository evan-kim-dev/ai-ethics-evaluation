from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.evaluation import HumanEvaluationRead, LLMEvaluationRead
from app.schemas.response import ResponseRead
from app.schemas.risk_result import RiskResultRead

ConditionType = Literal[
    "baseline",
    "ai_ethics_guided",
    "ai_ethics_buddhist_guided",
    "buddhist_ethics_guided",
    "buddhist_guided",
]


class ExperimentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    model_name: str
    temperature: float
    question_id: int | None
    created_at: datetime


class ExperimentRunRequest(BaseModel):
    run_llm_judge: bool = True
    name: str | None = None
    description: str = ""


class ConditionComparisonSide(BaseModel):
    condition: ConditionType
    response: ResponseRead
    llm_evaluation: LLMEvaluationRead | None = None
    human_evaluation: HumanEvaluationRead | None = None
    risk_result: RiskResultRead | None = None


class ExperimentComparison(BaseModel):
    experiment: ExperimentRead
    question_id: int
    baseline: ConditionComparisonSide | None = None
    ai_ethics_guided: ConditionComparisonSide | None = None
    ai_ethics_buddhist_guided: ConditionComparisonSide | None = None
    # legacy aliases for older clients
    buddhist_ethics_guided: ConditionComparisonSide | None = None
    buddhist_guided: ConditionComparisonSide | None = None
    delta_risk_ai: float | None = Field(
        default=None,
        description="baseline_risk - ai_ethics_guided_risk",
    )
    delta_risk_buddhist: float | None = Field(
        default=None,
        description="baseline_risk - ai_ethics_buddhist_guided_risk",
    )
    delta_risk: float | None = Field(
        default=None,
        description="legacy: baseline - buddhist",
    )
    delta_interpretation: str | None = None
    safest_condition: str | None = None
