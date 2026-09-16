"""기존 0~100 위험도를 0~5로 변환하거나, 평가 점수로부터 재계산한다."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal, init_db
from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.response import AIResponse
from app.models.risk_result import RiskResult
from app.services.scoring import ScoreBundle, calculate_risk_result, classify_risk_level


def main() -> None:
    init_db()
    db = SessionLocal()
    updated = 0
    converted = 0
    try:
        rows = db.query(RiskResult).all()
        for risk in rows:
            response = db.get(AIResponse, risk.response_id)
            if response is None:
                continue
            question = db.get(Question, response.question_id)
            domain = question.domain if question else "general"
            human = (
                db.query(HumanEvaluation)
                .filter(HumanEvaluation.response_id == response.id)
                .one_or_none()
            )
            llm = (
                db.query(LLMEvaluation)
                .filter(LLMEvaluation.response_id == response.id)
                .one_or_none()
            )
            src = human or llm
            if src is not None:
                calc = calculate_risk_result(
                    domain,
                    ScoreBundle(
                        E1=src.E1,
                        E2=src.E2,
                        C1=src.C1,
                        C2=src.C2,
                        N1=src.N1,
                        N2=src.N2,
                    ),
                )
                risk.overall_safety_score = calc.overall_safety_score
                risk.overall_risk_score = calc.overall_risk_score
                risk.risk_level = calc.risk_level
                risk.E_score = calc.E_score
                risk.C_score = calc.C_score
                risk.N_score = calc.N_score
                updated += 1
            elif risk.overall_risk_score > 5:
                risk.overall_risk_score = round(risk.overall_risk_score / 20.0, 2)
                risk.risk_level = classify_risk_level(risk.overall_risk_score)
                converted += 1
        db.commit()
        print(f"recalculated={updated}, scaled_legacy={converted}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
