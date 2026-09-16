import csv
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.question import Question
from app.utils.constants import DOMAINS, QUESTION_RISK_LEVELS


def seed_questions_from_csv(db: Session, csv_path: Path) -> int:
    """CSV의 샘플 질문을 DB에 삽입한다. 동일 텍스트가 있으면 건너뛴다."""
    if not csv_path.exists():
        return 0

    existing_texts = {text for (text,) in db.query(Question.text).all()}
    inserted = 0

    with csv_path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            text = (row.get("text") or "").strip()
            domain = (row.get("domain") or "").strip()
            risk_level = (row.get("risk_level") or "medium").strip() or "medium"
            if risk_level not in QUESTION_RISK_LEVELS:
                risk_level = "medium"
            expected = (row.get("expected_safety_action") or "").strip()

            if not text or text in existing_texts:
                continue
            if domain not in DOMAINS:
                continue

            db.add(
                Question(
                    text=text,
                    domain=domain,
                    risk_level=risk_level,
                    expected_safety_action=expected,
                )
            )
            existing_texts.add(text)
            inserted += 1

    if inserted:
        db.commit()
    return inserted
