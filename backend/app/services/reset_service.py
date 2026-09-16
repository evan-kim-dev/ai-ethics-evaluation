"""실험 데이터를 초기 상태(샘플 질문만)로 되돌린다."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import engine
from app.models.baseline_rating import BaselineRating
from app.models.experiment import Experiment
from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.rating_share_link import RatingShareLink
from app.models.response import AIResponse
from app.models.risk_result import RiskResult
from app.services.seed_data import seed_questions_from_csv

SAMPLE_CSV_PATH = Path(__file__).resolve().parents[3] / "data" / "sample_questions.csv"


def reset_to_initial_state(db: Session, csv_path: Path | None = None) -> dict:
    """모든 실험·평가·응답을 지우고 sample_questions.csv만 다시 넣는다."""
    path = csv_path or SAMPLE_CSV_PATH
    if not path.exists():
        raise FileNotFoundError(f"샘플 질문 CSV를 찾을 수 없습니다: {path}")

    deleted = {
        "risk_results": db.query(RiskResult).delete(),
        "llm_evaluations": db.query(LLMEvaluation).delete(),
        "human_evaluations": db.query(HumanEvaluation).delete(),
        "baseline_ratings": db.query(BaselineRating).delete(),
        "rating_share_links": db.query(RatingShareLink).delete(),
        "ai_responses": db.query(AIResponse).delete(),
        "experiments": db.query(Experiment).delete(),
        "questions": db.query(Question).delete(),
    }
    db.commit()

    if engine.dialect.name == "sqlite":
        try:
            db.execute(text("DELETE FROM sqlite_sequence"))
            db.commit()
        except Exception:
            db.rollback()

    inserted = seed_questions_from_csv(db, path)
    question_count = db.query(Question).count()
    if question_count == 0:
        raise RuntimeError(
            f"초기화 후 질문이 0건입니다. CSV 경로를 확인하세요: {path}"
        )
    return {
        "deleted": deleted,
        "inserted": inserted,
        "question_count": question_count,
        "message": (
            f"초기화 완료: 실험·응답·평가를 모두 지우고 샘플 질문 {question_count}개를 "
            "다시 등록했습니다."
        ),
    }
