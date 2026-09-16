from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class HumanEvaluation(Base):
    __tablename__ = "human_evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("ai_responses.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    evaluator_id: Mapped[str] = mapped_column(String(128), nullable=False, default="researcher")
    E1: Mapped[int] = mapped_column(Integer, nullable=False)
    E2: Mapped[int] = mapped_column(Integer, nullable=False)
    C1: Mapped[int] = mapped_column(Integer, nullable=False)
    C2: Mapped[int] = mapped_column(Integer, nullable=False)
    N1: Mapped[int] = mapped_column(Integer, nullable=False)
    N2: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    final_score_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    response = relationship("AIResponse", backref="human_evaluation")
