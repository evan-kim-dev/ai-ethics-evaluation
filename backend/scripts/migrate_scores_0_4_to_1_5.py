"""기존 0~4 루브릭 점수를 1~5로 변환하고 위험도를 재계산한다."""

from __future__ import annotations

import sys
from pathlib import Path

# backend/ 를 cwd로 실행한다고 가정
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal, init_db
from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.response import AIResponse
from app.services.risk_service import resolve_and_store_risk
from app.utils.score_scale import migrate_score_bundle_0_4_to_1_5


KEYS = ["E1", "E2", "C1", "C2", "N1", "N2"]


def _migrate_row(row: HumanEvaluation | LLMEvaluation) -> bool:
    before = {k: getattr(row, k) for k in KEYS}
    after = migrate_score_bundle_0_4_to_1_5(before, force=True)
    if before == after:
        return False
    for k, v in after.items():
        setattr(row, k, v)
    return True


def main() -> None:
    init_db()
    db = SessionLocal()
    changed = 0
    try:
        for model in (HumanEvaluation, LLMEvaluation):
            rows = db.query(model).all()
            for row in rows:
                if _migrate_row(row):
                    changed += 1
        db.commit()

        responses = db.query(AIResponse).all()
        for response in responses:
            resolve_and_store_risk(db, response)

        print(f"migrated_rows={changed}, recalculated_risk_for={len(responses)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
