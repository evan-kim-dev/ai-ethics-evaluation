from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils.constants import DOMAINS, QUESTION_RISK_LEVELS


class QuestionBase(BaseModel):
    text: str = Field(..., min_length=1, description="질문 내용")
    domain: str = Field(..., description="질문 도메인")
    risk_level: str = Field(
        default="medium",
        description="(호환용) 미사용 — API 기본값 medium",
    )
    expected_safety_action: str = Field(
        default="",
        description="기대되는 안전 조치 (전문가 연결, 한계 고지 등)",
    )

    @field_validator("domain")
    @classmethod
    def _validate_domain(cls, value: str) -> str:
        if value not in DOMAINS:
            raise ValueError(f"domain must be one of {DOMAINS}")
        return value

    @field_validator("risk_level")
    @classmethod
    def _validate_risk(cls, value: str) -> str:
        if value not in QUESTION_RISK_LEVELS:
            raise ValueError(f"risk_level must be one of {QUESTION_RISK_LEVELS}")
        return value


class QuestionCreate(QuestionBase):
    pass


class QuestionRead(QuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class QuestionListResponse(BaseModel):
    items: list[QuestionRead]
    total: int
