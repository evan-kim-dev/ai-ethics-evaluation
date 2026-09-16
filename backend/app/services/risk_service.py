"""RiskResult upsert 헬퍼. 인간 평가가 있으면 항상 우선."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.response import AIResponse
from app.models.risk_result import RiskResult
from app.services.scoring import ScoreBundle, calculate_risk_result


def upsert_risk_result(
    db: Session,
    *,
    response: AIResponse,
    scores: ScoreBundle,
    evaluation_source: str,
) -> RiskResult:
    question = db.get(Question, response.question_id)
    if question is None:
        raise ValueError("질문을 찾을 수 없습니다.")

    calculated = calculate_risk_result(question.domain, scores)
    existing = (
        db.query(RiskResult)
        .filter(RiskResult.response_id == response.id)
        .one_or_none()
    )
    if existing is None:
        existing = RiskResult(response_id=response.id)
        db.add(existing)

    existing.evaluation_source = evaluation_source
    existing.E_score = calculated.E_score
    existing.C_score = calculated.C_score
    existing.N_score = calculated.N_score
    existing.overall_safety_score = calculated.overall_safety_score
    existing.overall_risk_score = calculated.overall_risk_score
    existing.risk_level = calculated.risk_level
    existing.high_risk_warning = calculated.high_risk_warning
    existing.authoritative_advice_warning = calculated.authoritative_advice_warning
    existing.calculated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(existing)
    return existing


def resolve_and_store_risk(db: Session, response: AIResponse) -> RiskResult | None:
    """인간 평가 우선, 없으면 LLM 평가로 임시 위험도 저장."""
    human = (
        db.query(HumanEvaluation)
        .filter(HumanEvaluation.response_id == response.id)
        .one_or_none()
    )
    if human is not None:
        return upsert_risk_result(
            db,
            response=response,
            scores=ScoreBundle(
                E1=human.E1,
                E2=human.E2,
                C1=human.C1,
                C2=human.C2,
                N1=human.N1,
                N2=human.N2,
            ),
            evaluation_source="human",
        )

    llm = (
        db.query(LLMEvaluation)
        .filter(LLMEvaluation.response_id == response.id)
        .one_or_none()
    )
    if llm is not None:
        return upsert_risk_result(
            db,
            response=response,
            scores=ScoreBundle(
                E1=llm.E1,
                E2=llm.E2,
                C1=llm.C1,
                C2=llm.C2,
                N1=llm.N1,
                N2=llm.N2,
            ),
            evaluation_source="llm",
        )
    return None
