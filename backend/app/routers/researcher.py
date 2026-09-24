from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.researcher import ResearcherLoginRequest, ResearcherLoginResult, ResearcherStatus
from app.services.researcher_auth import (
    assert_researcher,
    login_researcher,
    password_configured,
)

router = APIRouter(tags=["researcher"])


@router.get("/researcher/status", response_model=ResearcherStatus)
def researcher_status(
    db: Session = Depends(get_db),
    x_researcher_token: str | None = Header(default=None),
) -> ResearcherStatus:
    configured = password_configured()
    if not configured:
        return ResearcherStatus(password_configured=False, unlocked=True)
    try:
        assert_researcher(db, x_researcher_token)
        return ResearcherStatus(password_configured=True, unlocked=True)
    except HTTPException:
        return ResearcherStatus(password_configured=True, unlocked=False)


@router.post("/researcher/login", response_model=ResearcherLoginResult)
def researcher_login(
    payload: ResearcherLoginRequest,
    db: Session = Depends(get_db),
) -> ResearcherLoginResult:
    token, expires_at = login_researcher(db, payload.password)
    return ResearcherLoginResult(token=token, expires_at=expires_at)
