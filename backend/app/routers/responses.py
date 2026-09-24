from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.sqlite_store import delete_baseline_rating_blobs_for_response
from app.models.baseline_rating import BaselineRating
from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.rating_share_link import RatingShareLink
from app.models.response import AIResponse
from app.models.risk_result import RiskResult
from app.schemas.response import (
    ResponseCreate,
    ResponseGenerateRequest,
    ResponseListResponse,
    ResponseRead,
    ResponseUpdate,
)
from app.services.llm_client import LLMClientError
from app.services.researcher_auth import assert_researcher
from app.services.response_generator import ResponseGenerator
from app.utils.constants import CONDITIONS

router = APIRouter(tags=["responses"])


def _clear_response_side_effects(db: Session, response_id: int) -> None:
    db.query(RiskResult).filter(RiskResult.response_id == response_id).delete()
    db.query(HumanEvaluation).filter(HumanEvaluation.response_id == response_id).delete()
    db.query(LLMEvaluation).filter(LLMEvaluation.response_id == response_id).delete()
    db.query(BaselineRating).filter(BaselineRating.response_id == response_id).delete()
    db.query(RatingShareLink).filter(RatingShareLink.response_id == response_id).delete()
    delete_baseline_rating_blobs_for_response(response_id)


@router.post("/responses/generate", response_model=ResponseRead, status_code=status.HTTP_201_CREATED)
def generate_response(
    payload: ResponseGenerateRequest,
    db: Session = Depends(get_db),
) -> AIResponse:
    question = db.get(Question, payload.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")
    if payload.condition not in CONDITIONS:
        raise HTTPException(status_code=400, detail="유효하지 않은 condition입니다.")

    try:
        result = ResponseGenerator().generate(
            db,
            question=question,
            condition=payload.condition,
            experiment_id=payload.experiment_id,
        )
    except LLMClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result.response


@router.post("/responses", response_model=ResponseRead, status_code=status.HTTP_201_CREATED)
def create_response(payload: ResponseCreate, db: Session = Depends(get_db)) -> AIResponse:
    question = db.get(Question, payload.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")
    if payload.condition not in CONDITIONS:
        raise HTTPException(status_code=400, detail="유효하지 않은 condition입니다.")

    response = AIResponse(
        question_id=payload.question_id,
        experiment_id=payload.experiment_id,
        condition=payload.condition,
        model_name=payload.model_name.strip() or "manual",
        system_prompt_version=payload.system_prompt_version.strip() or "manual-v1",
        response_text=payload.response_text.strip(),
        generation_params_json=payload.generation_params_json or "{}",
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return response


@router.get("/responses/{response_id}", response_model=ResponseRead)
def get_response(response_id: int, db: Session = Depends(get_db)) -> AIResponse:
    response = db.get(AIResponse, response_id)
    if response is None:
        raise HTTPException(status_code=404, detail="응답을 찾을 수 없습니다.")
    return response


@router.put("/responses/{response_id}", response_model=ResponseRead)
def update_response(
    response_id: int,
    payload: ResponseUpdate,
    db: Session = Depends(get_db),
    x_researcher_token: str | None = Header(default=None, alias="X-Researcher-Token"),
) -> AIResponse:
    assert_researcher(db, x_researcher_token)
    response = db.get(AIResponse, response_id)
    if response is None:
        raise HTTPException(status_code=404, detail="응답을 찾을 수 없습니다.")

    text = payload.response_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="응답 본문이 비어 있습니다.")

    changed = text != response.response_text
    if payload.model_name is not None:
        model = payload.model_name.strip() or response.model_name
        if model != response.model_name:
            response.model_name = model
            changed = True

    response.response_text = text
    if changed and payload.clear_evaluations:
        _clear_response_side_effects(db, response_id)

    db.commit()
    db.refresh(response)
    return response


@router.get("/questions/{question_id}/responses", response_model=ResponseListResponse)
def list_question_responses(
    question_id: int,
    db: Session = Depends(get_db),
) -> ResponseListResponse:
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")

    items = (
        db.query(AIResponse)
        .filter(AIResponse.question_id == question_id)
        .order_by(AIResponse.id.desc())
        .all()
    )
    return ResponseListResponse(items=items, total=len(items))


@router.delete("/responses/{response_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_response(
    response_id: int,
    db: Session = Depends(get_db),
    x_researcher_token: str | None = Header(default=None, alias="X-Researcher-Token"),
) -> None:
    assert_researcher(db, x_researcher_token)
    response = db.get(AIResponse, response_id)
    if response is None:
        raise HTTPException(status_code=404, detail="응답을 찾을 수 없습니다.")

    _clear_response_side_effects(db, response_id)
    db.delete(response)
    db.commit()
