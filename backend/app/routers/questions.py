from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.question import Question
from app.schemas.question import QuestionCreate, QuestionListResponse, QuestionRead
from app.services.question_service import (
    LIVE_EPHEMERAL_DOMAIN,
    LIVE_EPHEMERAL_MARKER,
    delete_question_cascade,
    purge_live_ephemeral_questions,
)
from app.services.reset_service import reset_to_initial_state
from app.services.seed_data import seed_questions_from_csv
from app.utils.constants import DOMAINS, QUESTION_RISK_LEVELS

router = APIRouter(prefix="/questions", tags=["questions"])

SAMPLE_CSV_PATH = Path(__file__).resolve().parents[3] / "data" / "sample_questions.csv"

MANAGED_DOMAINS = [d for d in DOMAINS if d != LIVE_EPHEMERAL_DOMAIN]


@router.get("", response_model=QuestionListResponse)
def list_questions(
    domain: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> QuestionListResponse:
    # 실시간 평가 잔여분이 있으면 목록 조회 시 정리
    purge_live_ephemeral_questions(db)

    query = db.query(Question).filter(
        Question.domain != LIVE_EPHEMERAL_DOMAIN,
        Question.expected_safety_action != LIVE_EPHEMERAL_MARKER,
    )

    if domain is not None:
        if domain not in MANAGED_DOMAINS:
            raise HTTPException(status_code=400, detail=f"유효하지 않은 domain: {domain}")
        query = query.filter(Question.domain == domain)

    if risk_level is not None:
        if risk_level not in QUESTION_RISK_LEVELS:
            raise HTTPException(status_code=400, detail=f"유효하지 않은 risk_level: {risk_level}")
        query = query.filter(Question.risk_level == risk_level)

    total = query.count()
    items = (
        query.order_by(Question.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return QuestionListResponse(items=items, total=total)


@router.post("", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
) -> Question:
    if payload.domain == LIVE_EPHEMERAL_DOMAIN:
        raise HTTPException(
            status_code=400,
            detail="실시간 평가용 도메인은 질문 관리에 등록할 수 없습니다.",
        )
    question = Question(
        text=payload.text.strip(),
        domain=payload.domain,
        risk_level=payload.risk_level,
        expected_safety_action=payload.expected_safety_action.strip(),
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.post("/seed", response_model=dict)
def seed_questions(db: Session = Depends(get_db)) -> dict:
    """sample_questions.csv 기준으로 누락된 샘플 질문을 추가한다."""
    inserted = seed_questions_from_csv(db, SAMPLE_CSV_PATH)
    return {"inserted": inserted, "message": f"{inserted}개의 샘플 질문을 추가했습니다."}


@router.post("/reset-initial", response_model=dict)
def reset_questions_to_initial(db: Session = Depends(get_db)) -> dict:
    """실험·평가·응답을 모두 지우고 샘플 질문만 남긴다 (초기 상태)."""
    try:
        return reset_to_initial_state(db, SAMPLE_CSV_PATH)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"초기화 실패: {exc}") from exc


@router.get("/{question_id}", response_model=QuestionRead)
def get_question(question_id: int, db: Session = Depends(get_db)) -> Question:
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db)) -> None:
    from app.services.question_service import delete_question_cascade

    if not delete_question_cascade(db, question_id):
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")
