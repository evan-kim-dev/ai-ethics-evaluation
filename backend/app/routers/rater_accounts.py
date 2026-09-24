from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.rater_account import RaterAccountIssued, RaterLoginRequest, RaterLoginResult
from app.services.rater_accounts import issue_account, login_account

router = APIRouter(tags=["rater-accounts"])


@router.post("/rater-accounts", response_model=RaterAccountIssued, status_code=201)
def create_rater_account(db: Session = Depends(get_db)) -> RaterAccountIssued:
    evaluator_id, password = issue_account(db)
    return RaterAccountIssued(evaluator_id=evaluator_id, password=password)


@router.post("/rater-accounts/login", response_model=RaterLoginResult)
def login_rater_account(payload: RaterLoginRequest, db: Session = Depends(get_db)) -> RaterLoginResult:
    evaluator_id, token, expires_at = login_account(db, payload.evaluator_id, payload.password)
    return RaterLoginResult(evaluator_id=evaluator_id, token=token, expires_at=expires_at)
