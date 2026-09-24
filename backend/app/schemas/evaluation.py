from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils.score_scale import SCORE_MAX, SCORE_MIN, migrate_score_0_4_to_1_5


class RubricScores(BaseModel):
    E1: int = Field(..., ge=SCORE_MIN, le=SCORE_MAX)
    E2: int = Field(..., ge=SCORE_MIN, le=SCORE_MAX)
    C1: int = Field(..., ge=SCORE_MIN, le=SCORE_MAX)
    C2: int = Field(..., ge=SCORE_MIN, le=SCORE_MAX)
    N1: int = Field(..., ge=SCORE_MIN, le=SCORE_MAX)
    N2: int = Field(..., ge=SCORE_MIN, le=SCORE_MAX)

    @field_validator("E1", "E2", "C1", "C2", "N1", "N2", mode="before")
    @classmethod
    def _coerce_legacy_zero(cls, value: object) -> object:
        if isinstance(value, int) and value == 0:
            return migrate_score_0_4_to_1_5(0)
        return value


class HumanEvaluationCreate(RubricScores):
    evaluator_id: str = Field(default="researcher", min_length=1)
    note: str = ""
    final_score_confirmed: bool = True


class HumanEvaluationUpdate(RubricScores):
    evaluator_id: str | None = None
    note: str | None = None
    final_score_confirmed: bool | None = None


class HumanEvaluationRead(RubricScores):
    model_config = ConfigDict(from_attributes=True)

    id: int
    response_id: int
    evaluator_id: str
    note: str
    final_score_confirmed: bool
    created_at: datetime
    updated_at: datetime


class LLMEvaluationRead(RubricScores):
    model_config = ConfigDict(from_attributes=True)

    id: int
    response_id: int
    evaluator_type: str
    B1: int | None = None
    B2: int | None = None
    B3: int | None = None
    reasoning_json: str
    risk_signals_json: str
    confidence: float
    created_at: datetime


def _is_half_step(value: float) -> bool:
    return abs(value * 2 - round(value * 2)) < 1e-9


class BaselineRatingCreate(BaseModel):
    star_rating: float = Field(..., ge=1.0, le=5.0)
    evaluator_id: str = Field(default="researcher", min_length=1)
    note: str = ""

    @field_validator("star_rating")
    @classmethod
    def _half_star(cls, value: float) -> float:
        if not _is_half_step(value):
            raise ValueError("별점은 0.5 단위여야 합니다 (예: 1, 1.5, ..., 5).")
        return round(value * 2) / 2


class BaselineRatingUpdate(BaseModel):
    star_rating: float | None = Field(default=None, ge=1.0, le=5.0)
    evaluator_id: str | None = None
    note: str | None = None

    @field_validator("star_rating")
    @classmethod
    def _half_star(cls, value: float | None) -> float | None:
        if value is None:
            return None
        if not _is_half_step(value):
            raise ValueError("별점은 0.5 단위여야 합니다 (예: 1, 1.5, ..., 5).")
        return round(value * 2) / 2


class BaselineRatingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    response_id: int
    evaluator_id: str
    star_rating: float
    note: str
    created_at: datetime
    updated_at: datetime


class BaselineRatingAdminRead(BaselineRatingRead):
    question_id: int | None = None
    question_text: str | None = None
    condition: str | None = None


class RatingShareLinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    token: str
    response_id: int
    is_active: bool
    created_at: datetime
    path: str
    rating_count: int = 0


class PublicRatePageRead(BaseModel):
    token: str
    response_id: int
    question_text: str
    domain: str
    response_text: str
    model_name: str
    is_active: bool


class PublicBaselineRatingCreate(BaseModel):
    star_rating: float = Field(..., ge=1.0, le=5.0)
    evaluator_id: str = Field(..., min_length=1, max_length=64)
    note: str = ""

    @field_validator("star_rating")
    @classmethod
    def _half_star(cls, value: float) -> float:
        if not _is_half_step(value):
            raise ValueError("별점은 0.5 단위여야 합니다 (예: 1, 1.5, ..., 5).")
        return round(value * 2) / 2

    @field_validator("evaluator_id")
    @classmethod
    def _trim_evaluator(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("평가자 ID를 입력해주세요.")
        return cleaned

    @field_validator("note")
    @classmethod
    def _trim_note(cls, value: str) -> str:
        return value.strip()
