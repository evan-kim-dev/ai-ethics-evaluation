from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ConditionType = Literal[
    "baseline",
    "ai_ethics_guided",
    "ai_ethics_buddhist_guided",
    "buddhist_ethics_guided",  # legacy
    "buddhist_guided",  # legacy
]


class ResponseCreate(BaseModel):
    question_id: int
    condition: ConditionType
    response_text: str = Field(..., min_length=1)
    model_name: str = "manual"
    system_prompt_version: str = "manual-v1"
    experiment_id: int | None = None
    generation_params_json: str = "{}"


class ResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    experiment_id: int | None
    condition: ConditionType
    model_name: str
    system_prompt_version: str
    response_text: str
    generation_params_json: str
    created_at: datetime


class ResponseListResponse(BaseModel):
    items: list[ResponseRead]
    total: int


class ResponseGenerateRequest(BaseModel):
    question_id: int
    condition: ConditionType
    experiment_id: int | None = None
