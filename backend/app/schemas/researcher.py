from datetime import datetime

from pydantic import BaseModel, Field


class ResearcherLoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=128)


class ResearcherLoginResult(BaseModel):
    token: str
    expires_at: datetime


class ResearcherStatus(BaseModel):
    password_configured: bool
    unlocked: bool = False
