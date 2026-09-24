from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.sqlite_store import (
    list_baseline_rating_blobs,
    read_baseline_rating_blob,
    save_baseline_rating_blob,
)
from app.models.baseline_rating import BaselineRating
from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.rating_share_link import RatingShareLink, generate_share_token
from app.models.response import AIResponse
from app.models.risk_result import RiskResult
from app.schemas.evaluation import (
    BaselineRatingCreate,
    BaselineRatingRead,
    BaselineRatingUpdate,
    HumanEvaluationCreate,
    HumanEvaluationRead,
    HumanEvaluationUpdate,
    LLMEvaluationRead,
    PublicBaselineRatingCreate,
    PublicRatePageRead,
    RatingShareLinkRead,
)
from app.schemas.risk_result import RiskResultRead
from app.services.llm_client import LLMClientError
from app.services.llm_judge import LLMJudge, LLMJudgeError
from app.services.risk_service import resolve_and_store_risk, upsert_risk_result
from app.services.rater_accounts import assert_issued_rater
from app.services.scoring import ScoreBundle

router = APIRouter(tags=["evaluations"])


def _get_response_or_404(db: Session, response_id: int) -> AIResponse:
    response = db.get(AIResponse, response_id)
    if response is None:
        raise HTTPException(status_code=404, detail="응답을 찾을 수 없습니다.")
    return response


def _ensure_baseline_response(response: AIResponse) -> None:
    if response.condition != "baseline":
        raise HTTPException(
            status_code=400,
            detail="별점 평가는 Baseline 응답에만 사용할 수 있습니다.",
        )


def _upsert_baseline_rating(
    db: Session,
    *,
    response_id: int,
    evaluator_id: str,
    star_rating: float,
    note: str,
) -> BaselineRating:
    evaluator = evaluator_id.strip() or "researcher"
    existing = (
        db.query(BaselineRating)
        .filter(
            BaselineRating.response_id == response_id,
            BaselineRating.evaluator_id == evaluator,
        )
        .one_or_none()
    )
    if existing is not None:
        existing.star_rating = star_rating
        existing.note = note.strip()
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return _mirror_rating(existing)

    rating = BaselineRating(
        response_id=response_id,
        evaluator_id=evaluator,
        star_rating=star_rating,
        note=note.strip(),
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return _mirror_rating(rating)


def _rating_record(rating: BaselineRating) -> dict:
    return {
        "id": rating.id,
        "response_id": rating.response_id,
        "evaluator_id": rating.evaluator_id,
        "star_rating": rating.star_rating,
        "note": rating.note or "",
        "created_at": rating.created_at.isoformat(),
        "updated_at": rating.updated_at.isoformat(),
    }


def _stamp(value: datetime | str | None) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and value:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        return datetime.min.replace(tzinfo=timezone.utc)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _mirror_rating(rating: BaselineRating) -> BaselineRating:
    if not save_baseline_rating_blob(_rating_record(rating)):
        raise HTTPException(
            status_code=503,
            detail="별점 저장본을 올리지 못했습니다. 다시 저장해 주세요.",
        )
    return rating


def _prefer_blob(sqlite_rating: BaselineRating | None, blob: dict | None) -> BaselineRating | BaselineRatingRead | None:
    if blob is None:
        return sqlite_rating
    if sqlite_rating is None or _stamp(blob.get("updated_at")) >= _stamp(sqlite_rating.updated_at):
        return BaselineRatingRead.model_validate(blob)
    return sqlite_rating


def _share_link_read(db: Session, link: RatingShareLink) -> RatingShareLinkRead:
    count = (
        db.query(BaselineRating)
        .filter(BaselineRating.response_id == link.response_id)
        .count()
    )
    return RatingShareLinkRead(
        id=link.id,
        token=link.token,
        response_id=link.response_id,
        is_active=link.is_active,
        created_at=link.created_at,
        path=f"/rate/{link.token}",
        rating_count=count,
    )


@router.post(
    "/responses/{response_id}/human-evaluation",
    response_model=HumanEvaluationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_human_evaluation(
    response_id: int,
    payload: HumanEvaluationCreate,
    db: Session = Depends(get_db),
) -> HumanEvaluation:
    response = _get_response_or_404(db, response_id)
    existing = (
        db.query(HumanEvaluation)
        .filter(HumanEvaluation.response_id == response_id)
        .one_or_none()
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="이미 인간 평가가 존재합니다. PUT으로 수정하세요.",
        )

    evaluation = HumanEvaluation(
        response_id=response.id,
        evaluator_id=payload.evaluator_id.strip() or "researcher",
        E1=payload.E1,
        E2=payload.E2,
        C1=payload.C1,
        C2=payload.C2,
        N1=payload.N1,
        N2=payload.N2,
        note=payload.note.strip(),
        final_score_confirmed=payload.final_score_confirmed,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    upsert_risk_result(
        db,
        response=response,
        scores=ScoreBundle(
            E1=evaluation.E1,
            E2=evaluation.E2,
            C1=evaluation.C1,
            C2=evaluation.C2,
            N1=evaluation.N1,
            N2=evaluation.N2,
        ),
        evaluation_source="human",
    )
    db.refresh(evaluation)
    return evaluation


@router.put("/human-evaluations/{evaluation_id}", response_model=HumanEvaluationRead)
def update_human_evaluation(
    evaluation_id: int,
    payload: HumanEvaluationUpdate,
    db: Session = Depends(get_db),
) -> HumanEvaluation:
    evaluation = db.get(HumanEvaluation, evaluation_id)
    if evaluation is None:
        raise HTTPException(status_code=404, detail="인간 평가를 찾을 수 없습니다.")

    evaluation.E1 = payload.E1
    evaluation.E2 = payload.E2
    evaluation.C1 = payload.C1
    evaluation.C2 = payload.C2
    evaluation.N1 = payload.N1
    evaluation.N2 = payload.N2
    if payload.evaluator_id is not None:
        evaluation.evaluator_id = payload.evaluator_id.strip() or evaluation.evaluator_id
    if payload.note is not None:
        evaluation.note = payload.note.strip()
    if payload.final_score_confirmed is not None:
        evaluation.final_score_confirmed = payload.final_score_confirmed
    evaluation.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(evaluation)

    response = _get_response_or_404(db, evaluation.response_id)
    upsert_risk_result(
        db,
        response=response,
        scores=ScoreBundle(
            E1=evaluation.E1,
            E2=evaluation.E2,
            C1=evaluation.C1,
            C2=evaluation.C2,
            N1=evaluation.N1,
            N2=evaluation.N2,
        ),
        evaluation_source="human",
    )
    db.refresh(evaluation)
    return evaluation


@router.get(
    "/responses/{response_id}/human-evaluation",
    response_model=HumanEvaluationRead,
)
def get_human_evaluation(response_id: int, db: Session = Depends(get_db)) -> HumanEvaluation:
    _get_response_or_404(db, response_id)
    evaluation = (
        db.query(HumanEvaluation)
        .filter(HumanEvaluation.response_id == response_id)
        .one_or_none()
    )
    if evaluation is None:
        raise HTTPException(status_code=404, detail="인간 평가를 찾을 수 없습니다.")
    return evaluation


@router.post(
    "/responses/{response_id}/llm-evaluation",
    response_model=LLMEvaluationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_llm_evaluation(
    response_id: int,
    db: Session = Depends(get_db),
) -> LLMEvaluation:
    response = _get_response_or_404(db, response_id)
    question = db.get(Question, response.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")

    try:
        evaluation = LLMJudge().evaluate(db, question=question, response=response)
    except LLMJudgeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except LLMClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # 인간 평가가 없으면 LLM 결과를 임시 위험도로 사용
    resolve_and_store_risk(db, response)
    db.refresh(evaluation)
    return evaluation


@router.get(
    "/responses/{response_id}/llm-evaluation",
    response_model=LLMEvaluationRead,
)
def get_llm_evaluation(response_id: int, db: Session = Depends(get_db)) -> LLMEvaluation:
    _get_response_or_404(db, response_id)
    evaluation = (
        db.query(LLMEvaluation)
        .filter(LLMEvaluation.response_id == response_id)
        .one_or_none()
    )
    if evaluation is None:
        raise HTTPException(status_code=404, detail="LLM 평가를 찾을 수 없습니다.")
    return evaluation


@router.post(
    "/responses/{response_id}/calculate-risk",
    response_model=RiskResultRead,
)
def calculate_risk(response_id: int, db: Session = Depends(get_db)) -> RiskResult:
    response = _get_response_or_404(db, response_id)
    result = resolve_and_store_risk(db, response)
    if result is None:
        raise HTTPException(
            status_code=400,
            detail="위험도 계산을 위해 인간 평가 또는 LLM 평가가 필요합니다.",
        )
    return result


@router.get(
    "/responses/{response_id}/risk-result",
    response_model=RiskResultRead,
)
def get_risk_result(response_id: int, db: Session = Depends(get_db)) -> RiskResult:
    _get_response_or_404(db, response_id)
    result = (
        db.query(RiskResult)
        .filter(RiskResult.response_id == response_id)
        .one_or_none()
    )
    if result is None:
        raise HTTPException(status_code=404, detail="위험도 결과가 없습니다.")
    return result


@router.post(
    "/responses/{response_id}/baseline-rating",
    response_model=BaselineRatingRead,
    status_code=status.HTTP_201_CREATED,
)
def create_baseline_rating(
    response_id: int,
    payload: BaselineRatingCreate,
    db: Session = Depends(get_db),
    x_rater_token: str | None = Header(default=None),
) -> BaselineRating:
    response = _get_response_or_404(db, response_id)
    _ensure_baseline_response(response)
    assert_issued_rater(db, payload.evaluator_id, x_rater_token)
    return _upsert_baseline_rating(
        db,
        response_id=response_id,
        evaluator_id=payload.evaluator_id,
        star_rating=payload.star_rating,
        note=payload.note,
    )


@router.put("/baseline-ratings/{rating_id}", response_model=BaselineRatingRead)
def update_baseline_rating(
    rating_id: int,
    payload: BaselineRatingUpdate,
    db: Session = Depends(get_db),
    x_rater_token: str | None = Header(default=None),
) -> BaselineRating:
    rating = db.get(BaselineRating, rating_id)
    if rating is None:
        raise HTTPException(status_code=404, detail="별점 평가를 찾을 수 없습니다.")
    next_evaluator = payload.evaluator_id if payload.evaluator_id is not None else rating.evaluator_id
    assert_issued_rater(db, str(next_evaluator), x_rater_token)
    data = payload.model_dump(exclude_unset=True)
    if "evaluator_id" in data and data["evaluator_id"] is not None:
        data["evaluator_id"] = str(data["evaluator_id"]).strip() or rating.evaluator_id
    if "note" in data and data["note"] is not None:
        data["note"] = str(data["note"]).strip()
    for key, value in data.items():
        setattr(rating, key, value)
    rating.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rating)
    return _mirror_rating(rating)


@router.get(
    "/responses/{response_id}/baseline-rating",
    response_model=BaselineRatingRead,
)
def get_baseline_rating(
    response_id: int,
    evaluator_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> BaselineRating | BaselineRatingRead:
    _get_response_or_404(db, response_id)
    query = db.query(BaselineRating).filter(BaselineRating.response_id == response_id)
    if evaluator_id:
        cleaned = evaluator_id.strip()
        rating = query.filter(BaselineRating.evaluator_id == cleaned).one_or_none()
        chosen = _prefer_blob(rating, read_baseline_rating_blob(response_id, cleaned))
    else:
        rating = query.order_by(BaselineRating.updated_at.desc()).first()
        blobs = list_baseline_rating_blobs(response_id)
        newest = max(blobs, key=lambda item: _stamp(item.get("updated_at")), default=None)
        chosen = _prefer_blob(rating, newest)
    if chosen is None:
        raise HTTPException(status_code=404, detail="별점 평가를 찾을 수 없습니다.")
    return chosen


@router.get(
    "/responses/{response_id}/baseline-ratings",
    response_model=list[BaselineRatingRead],
)
def list_baseline_ratings(
    response_id: int,
    db: Session = Depends(get_db),
) -> list[BaselineRatingRead]:
    _get_response_or_404(db, response_id)
    rows = (
        db.query(BaselineRating)
        .filter(BaselineRating.response_id == response_id)
        .order_by(BaselineRating.updated_at.desc())
        .all()
    )
    merged: dict[str, dict] = {row.evaluator_id: _rating_record(row) for row in rows}
    for blob in list_baseline_rating_blobs(response_id):
        key = str(blob.get("evaluator_id") or "")
        if not key:
            continue
        current = merged.get(key)
        if current is None or _stamp(blob.get("updated_at")) >= _stamp(current.get("updated_at")):
            merged[key] = blob
    ordered = sorted(merged.values(), key=lambda item: _stamp(item.get("updated_at")), reverse=True)
    return [BaselineRatingRead.model_validate(item) for item in ordered]


@router.post(
    "/responses/{response_id}/share-link",
    response_model=RatingShareLinkRead,
    status_code=status.HTTP_201_CREATED,
)
def create_or_get_share_link(
    response_id: int,
    db: Session = Depends(get_db),
) -> RatingShareLinkRead:
    response = _get_response_or_404(db, response_id)
    _ensure_baseline_response(response)
    existing = (
        db.query(RatingShareLink)
        .filter(RatingShareLink.response_id == response_id)
        .one_or_none()
    )
    if existing is not None:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
        return _share_link_read(db, existing)

    link = RatingShareLink(response_id=response_id, token=generate_share_token())
    db.add(link)
    db.commit()
    db.refresh(link)
    return _share_link_read(db, link)


@router.get(
    "/responses/{response_id}/share-link",
    response_model=RatingShareLinkRead,
)
def get_share_link(response_id: int, db: Session = Depends(get_db)) -> RatingShareLinkRead:
    _get_response_or_404(db, response_id)
    link = (
        db.query(RatingShareLink)
        .filter(RatingShareLink.response_id == response_id)
        .one_or_none()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="공유 링크가 없습니다.")
    return _share_link_read(db, link)


@router.get("/public/rate/{token}", response_model=PublicRatePageRead)
def get_public_rate_page(token: str, db: Session = Depends(get_db)) -> PublicRatePageRead:
    link = db.query(RatingShareLink).filter(RatingShareLink.token == token).one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="공유 링크를 찾을 수 없습니다.")
    if not link.is_active:
        raise HTTPException(status_code=403, detail="이 평가 링크는 비활성화되었습니다.")

    response = _get_response_or_404(db, link.response_id)
    _ensure_baseline_response(response)
    question = db.get(Question, response.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")

    return PublicRatePageRead(
        token=link.token,
        response_id=response.id,
        question_text=question.text,
        domain=question.domain,
        response_text=response.response_text,
        model_name=response.model_name,
        is_active=link.is_active,
    )


@router.post(
    "/public/rate/{token}",
    response_model=BaselineRatingRead,
    status_code=status.HTTP_201_CREATED,
)
def submit_public_rating(
    token: str,
    payload: PublicBaselineRatingCreate,
    db: Session = Depends(get_db),
) -> BaselineRating:
    link = db.query(RatingShareLink).filter(RatingShareLink.token == token).one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="공유 링크를 찾을 수 없습니다.")
    if not link.is_active:
        raise HTTPException(status_code=403, detail="이 평가 링크는 비활성화되었습니다.")

    response = _get_response_or_404(db, link.response_id)
    _ensure_baseline_response(response)
    assert_issued_rater(db, payload.evaluator_id, None)
    return _upsert_baseline_rating(
        db,
        response_id=response.id,
        evaluator_id=payload.evaluator_id,
        star_rating=payload.star_rating,
        note=payload.note,
    )
