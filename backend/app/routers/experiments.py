from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.experiment import Experiment
from app.models.question import Question
from app.schemas.experiment import ExperimentComparison, ExperimentRunRequest
from app.services.experiment_service import ExperimentRunner, build_comparison
from app.services.llm_client import LLMClientError
from app.services.llm_judge import LLMJudgeError
from app.services.question_service import (
    LIVE_EPHEMERAL_DOMAIN,
    LIVE_EPHEMERAL_MARKER,
    delete_question_cascade,
    purge_live_ephemeral_questions,
)

router = APIRouter(prefix="/experiments", tags=["experiments"])


class LiveExperimentRequest(BaseModel):
    text: str = Field(..., min_length=1, description="실시간 평가용 프롬프트")
    run_llm_judge: bool = True


@router.post(
    "/run-live",
    response_model=ExperimentComparison,
    status_code=status.HTTP_201_CREATED,
)
def run_live_experiment(
    payload: LiveExperimentRequest,
    db: Session = Depends(get_db),
) -> ExperimentComparison:
    """실시간 평가 전용. 질문 관리에 남지 않도록 임시 행만 쓰고 항상 삭제한다."""
    # 이전에 끊긴 실시간 평가로 남은 임시 질문 정리
    purge_live_ephemeral_questions(db)

    question = Question(
        text=payload.text.strip(),
        domain=LIVE_EPHEMERAL_DOMAIN,
        risk_level="medium",
        expected_safety_action=LIVE_EPHEMERAL_MARKER,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    question_id = question.id
    comparison: ExperimentComparison | None = None

    try:
        comparison = ExperimentRunner().run_question(
            db,
            question=question,
            run_llm_judge=payload.run_llm_judge,
            name="live-chat-ephemeral",
            description="실시간 챗 평가 (저장하지 않음)",
        )
        # ORM 참조를 끊은 뒤 삭제해도 직렬화 가능하도록 순수 페이로드로 고정
        payload_data = comparison.model_dump()
        payload_data["question_id"] = 0
        if payload_data.get("experiment") is not None:
            payload_data["experiment"]["question_id"] = None
        comparison = ExperimentComparison.model_validate(payload_data)
    except LLMClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except LLMJudgeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        delete_question_cascade(db, question_id)

    if comparison is None:
        raise HTTPException(status_code=500, detail="실시간 평가 결과를 만들지 못했습니다.")
    return comparison


@router.post(
    "/run-question/{question_id}",
    response_model=ExperimentComparison,
    status_code=status.HTTP_201_CREATED,
)
def run_question_experiment(
    question_id: int,
    payload: ExperimentRunRequest = ExperimentRunRequest(),
    db: Session = Depends(get_db),
) -> ExperimentComparison:
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")

    try:
        return ExperimentRunner().run_question(
            db,
            question=question,
            run_llm_judge=payload.run_llm_judge,
            name=payload.name,
            description=payload.description,
        )
    except LLMClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except LLMJudgeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/by-question/{question_id}/latest", response_model=ExperimentComparison)
def get_latest_experiment_for_question(
    question_id: int,
    db: Session = Depends(get_db),
) -> ExperimentComparison:
    """해당 질문의 가장 최근 저장된 3조건 실험 비교 결과를 반환한다."""
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")

    experiment = (
        db.query(Experiment)
        .filter(Experiment.question_id == question_id)
        .order_by(Experiment.id.desc())
        .first()
    )
    if experiment is None:
        raise HTTPException(status_code=404, detail="저장된 실험 결과가 없습니다.")
    return build_comparison(db, experiment)


@router.get("/{experiment_id}/comparison", response_model=ExperimentComparison)
def get_experiment_comparison(
    experiment_id: int,
    db: Session = Depends(get_db),
) -> ExperimentComparison:
    experiment = db.get(Experiment, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail="실험을 찾을 수 없습니다.")
    return build_comparison(db, experiment)


@router.get("", response_model=list)
def list_experiments(db: Session = Depends(get_db), limit: int = 200):
    from app.schemas.experiment import ExperimentRead

    items = (
        db.query(Experiment)
        .order_by(Experiment.id.desc())
        .limit(min(limit, 500))
        .all()
    )
    return [ExperimentRead.model_validate(item) for item in items]
