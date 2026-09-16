"""질문 및 연관 실험 데이터 삭제."""

from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.baseline_rating import BaselineRating
from app.models.experiment import Experiment
from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.rating_share_link import RatingShareLink
from app.models.response import AIResponse
from app.models.risk_result import RiskResult

# 실시간 평가 전용 임시 질문 표시자 — 질문 관리/대시보드에 노출하지 않음
LIVE_EPHEMERAL_MARKER = "__LIVE_EPHEMERAL__"
LIVE_EPHEMERAL_DOMAIN = "live_test"


def is_live_ephemeral_question(question: Question) -> bool:
    return (
        question.domain == LIVE_EPHEMERAL_DOMAIN
        or (question.expected_safety_action or "").strip() == LIVE_EPHEMERAL_MARKER
    )


def delete_question_cascade(db: Session, question_id: int) -> bool:
    """질문과 연결된 응답·평가·실험을 모두 삭제한다. 없으면 False."""
    question = db.get(Question, question_id)
    if question is None:
        return False

    responses = db.query(AIResponse).filter(AIResponse.question_id == question_id).all()
    for response in responses:
        db.query(RiskResult).filter(RiskResult.response_id == response.id).delete()
        db.query(LLMEvaluation).filter(LLMEvaluation.response_id == response.id).delete()
        db.query(HumanEvaluation).filter(HumanEvaluation.response_id == response.id).delete()
        db.query(BaselineRating).filter(BaselineRating.response_id == response.id).delete()
        db.query(RatingShareLink).filter(RatingShareLink.response_id == response.id).delete()
        db.delete(response)

    db.query(Experiment).filter(Experiment.question_id == question_id).delete()
    db.delete(question)
    db.commit()
    return True


def purge_live_ephemeral_questions(db: Session) -> int:
    """실시간 평가로 남은 임시 질문을 모두 제거한다."""
    id_set: set[int] = {
        qid
        for (qid,) in db.query(Question.id)
        .filter(
            or_(
                Question.domain == LIVE_EPHEMERAL_DOMAIN,
                Question.expected_safety_action == LIVE_EPHEMERAL_MARKER,
            )
        )
        .all()
    }
    # 예전 구현(domain=general)으로 남은 live-chat 실험 연결분도 제거
    id_set.update(
        qid
        for (qid,) in db.query(Experiment.question_id)
        .filter(
            Experiment.name == "live-chat-ephemeral",
            Experiment.question_id.isnot(None),
        )
        .all()
        if qid is not None
    )
    removed = 0
    for qid in sorted(id_set):
        if delete_question_cascade(db, qid):
            removed += 1
    return removed
