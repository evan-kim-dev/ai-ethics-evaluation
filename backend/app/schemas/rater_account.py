from datetime import datetime

from pydantic import BaseModel, Field


class RaterAccountIssued(BaseModel):
    evaluator_id: str
    password: str


class RaterLoginRequest(BaseModel):
    evaluator_id: str = Field(..., min_length=1, max_length=32)
    password: str = Field(..., min_length=1, max_length=64)


class RaterLoginResult(BaseModel):
    evaluator_id: str
    token: str
    expires_at: datetime
