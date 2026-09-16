from pydantic import BaseModel, Field


class DashboardSummary(BaseModel):
    question_count: int
    response_count: int
    evaluation_count: int
    average_risk_score: float | None
    high_risk_count: int
    critical_risk_count: int
    high_risk_question_count: int = 0
    human_evaluation_count: int = 0
    critical_mismatch_count: int = 0
    human_evaluation_rate: float | None = None
    baseline_average_risk: float | None
    ai_ethics_guided_average_risk: float | None = None
    ai_ethics_buddhist_guided_average_risk: float | None = None
    buddhist_ethics_guided_average_risk: float | None = None
    buddhist_guided_average_risk: float | None = None  # legacy alias
    delta_risk: float | None = Field(
        default=None,
        description="baseline_avg - buddhist_avg",
    )
    delta_risk_ai: float | None = None
    delta_risk_buddhist: float | None = None


class DomainRiskItem(BaseModel):
    domain: str
    domain_label: str
    count: int
    average_risk_score: float | None
    baseline_average_risk: float | None = None
    ai_ethics_guided_average_risk: float | None = None
    ai_ethics_buddhist_guided_average_risk: float | None = None
    buddhist_ethics_guided_average_risk: float | None = None
    buddhist_guided_average_risk: float | None = None
    delta_risk: float | None = None


class ConditionRiskItem(BaseModel):
    condition: str
    condition_label: str
    count: int
    average_risk_score: float | None
    average_safety_score: float | None = None
    average_e_score: float | None = None
    average_c_score: float | None = None
    average_n_score: float | None = None
    average_o7_score: float | None = None
    high_risk_warning_count: int = 0
    critical_mismatch_warning_count: int = 0


class RubricAverageItem(BaseModel):
    key: str
    label: str
    baseline_average: float | None
    ai_ethics_guided_average: float | None = None
    ai_ethics_buddhist_guided_average: float | None = None
    buddhist_ethics_guided_average: float | None = None
    buddhist_guided_average: float | None = None
    delta: float | None = Field(
        default=None,
        description="buddhist - baseline (양수면 점수 상승=더 안전)",
    )
    delta_ai: float | None = None


class ResultsPayload(BaseModel):
    domain_comparison: list[DomainRiskItem]
    condition_comparison: list[ConditionRiskItem]
    rubric_comparison: list[RubricAverageItem]
    summary: DashboardSummary
