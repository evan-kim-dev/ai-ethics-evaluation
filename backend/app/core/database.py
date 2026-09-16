from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_baseline_ratings_multi_evaluator() -> None:
    """응답당 1개 별점 → (응답, 평가자) 단위로 스키마를 맞춘다 (SQLite)."""
    if not settings.database_url.startswith("sqlite"):
        return

    insp = inspect(engine)
    if "baseline_ratings" not in insp.get_table_names():
        return

    unique_constraints = insp.get_unique_constraints("baseline_ratings")
    indexes = insp.get_indexes("baseline_ratings")
    has_pair_unique = any(
        set(uc.get("column_names") or []) == {"response_id", "evaluator_id"}
        for uc in unique_constraints
    ) or any(
        idx.get("unique") and set(idx.get("column_names") or []) == {"response_id", "evaluator_id"}
        for idx in indexes
    )
    response_only_unique = any(
        idx.get("unique") and idx.get("column_names") == ["response_id"] for idx in indexes
    ) or any(uc.get("column_names") == ["response_id"] for uc in unique_constraints)

    if has_pair_unique and not response_only_unique:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS baseline_ratings_new (
                    id INTEGER NOT NULL PRIMARY KEY,
                    response_id INTEGER NOT NULL,
                    evaluator_id VARCHAR(128) NOT NULL,
                    star_rating FLOAT NOT NULL,
                    note TEXT NOT NULL,
                    created_at DATETIME,
                    updated_at DATETIME,
                    CONSTRAINT uq_baseline_rating_response_evaluator
                        UNIQUE (response_id, evaluator_id),
                    FOREIGN KEY(response_id) REFERENCES ai_responses (id)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO baseline_ratings_new
                    (id, response_id, evaluator_id, star_rating, note, created_at, updated_at)
                SELECT id, response_id, evaluator_id, star_rating, note, created_at, updated_at
                FROM baseline_ratings
                """
            )
        )
        conn.execute(text("DROP TABLE baseline_ratings"))
        conn.execute(text("ALTER TABLE baseline_ratings_new RENAME TO baseline_ratings"))
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_baseline_ratings_response_id ON baseline_ratings (response_id)")
        )
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_baseline_ratings_id ON baseline_ratings (id)")
        )


def init_db() -> None:
    """테이블 생성. 모델 import는 순환 참조를 피하기 위해 여기서 수행."""
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_baseline_ratings_multi_evaluator()
    _migrate_llm_buddhist_axes()
    _repair_legacy_risk_scores()


def _migrate_llm_buddhist_axes() -> None:
    """llm_evaluations에 B1/B2/B3 컬럼 추가 (SQLite)."""
    if not settings.database_url.startswith("sqlite"):
        return
    insp = inspect(engine)
    if "llm_evaluations" not in insp.get_table_names():
        return
    columns = {col["name"] for col in insp.get_columns("llm_evaluations")}
    with engine.begin() as conn:
        for name in ("B1", "B2", "B3"):
            if name not in columns:
                conn.execute(text(f"ALTER TABLE llm_evaluations ADD COLUMN {name} INTEGER"))


def _repair_legacy_risk_scores() -> None:
    """평가 점수 기준으로 R/S를 재계산. 구 0~100 잔존·불일치 모두 교정."""
    from app.models.human_evaluation import HumanEvaluation
    from app.models.llm_evaluation import LLMEvaluation
    from app.models.question import Question
    from app.models.response import AIResponse
    from app.models.risk_result import RiskResult
    from app.services.scoring import ScoreBundle, calculate_risk_result, normalize_risk_score

    insp = inspect(engine)
    if "risk_results" not in insp.get_table_names():
        return

    session = SessionLocal()
    try:
        rows = session.query(RiskResult).all()
        changed = False
        for risk in rows:
            response = session.get(AIResponse, risk.response_id)
            if response is None:
                continue
            question = session.get(Question, response.question_id)
            domain = question.domain if question is not None else "general"
            human = (
                session.query(HumanEvaluation)
                .filter(HumanEvaluation.response_id == response.id)
                .one_or_none()
            )
            llm = (
                session.query(LLMEvaluation)
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
                if (
                    abs(float(risk.overall_risk_score) - calc.overall_risk_score) > 0.051
                    or abs(float(risk.overall_safety_score) - calc.overall_safety_score) > 0.051
                ):
                    risk.overall_safety_score = calc.overall_safety_score
                    risk.overall_risk_score = calc.overall_risk_score
                    risk.risk_level = calc.risk_level
                    risk.E_score = calc.E_score
                    risk.C_score = calc.C_score
                    risk.N_score = calc.N_score
                    changed = True
                continue

            if float(risk.overall_risk_score) > 5:
                from app.services.scoring import classify_risk_level

                risk.overall_risk_score = normalize_risk_score(risk.overall_risk_score)
                risk.risk_level = classify_risk_level(risk.overall_risk_score)
                changed = True
        if changed:
            session.commit()
    finally:
        session.close()
