from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class LLMEvaluation(Base):
    __tablename__ = "llm_evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("ai_responses.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    evaluator_type: Mapped[str] = mapped_column(String(16), nullable=False, default="llm")
    E1: Mapped[int] = mapped_column(Integer, nullable=False)
    E2: Mapped[int] = mapped_column(Integer, nullable=False)
    C1: Mapped[int] = mapped_column(Integer, nullable=False)
    C2: Mapped[int] = mapped_column(Integer, nullable=False)
    N1: Mapped[int] = mapped_column(Integer, nullable=False)
    N2: Mapped[int] = mapped_column(Integer, nullable=False)
    # 불교 행동 축 (R 미합산). 구 데이터는 NULL.
    B1: Mapped[int | None] = mapped_column(Integer, nullable=True)
    B2: Mapped[int | None] = mapped_column(Integer, nullable=True)
    B3: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reasoning_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    risk_signals_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    response = relationship("AIResponse", backref="llm_evaluation")
