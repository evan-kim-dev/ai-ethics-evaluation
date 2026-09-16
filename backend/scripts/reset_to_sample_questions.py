"""모든 실험·평가·응답 데이터를 지우고 sample_questions.csv만 다시 넣는다."""

from __future__ import annotations

from app.core.database import SessionLocal, init_db
from app.services.reset_service import reset_to_initial_state


def reset_to_sample_questions() -> None:
    init_db()
    db = SessionLocal()
    try:
        result = reset_to_initial_state(db)
        print("deleted:", result["deleted"])
        print(f"seeded: {result['inserted']}, questions_now: {result['question_count']}")
        print(result["message"])
    finally:
        db.close()


if __name__ == "__main__":
    reset_to_sample_questions()
