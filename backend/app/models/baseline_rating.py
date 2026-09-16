from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BaselineRating(Base):
    """Baseline 응답에 대한 인간 별점(1.0~5.0, 0.5 단위). 평가자별로 1건씩 저장."""

    __tablename__ = "baseline_ratings"
    __table_args__ = (
        UniqueConstraint("response_id", "evaluator_id", name="uq_baseline_rating_response_evaluator"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("ai_responses.id"),
        nullable=False,
        index=True,
    )
    evaluator_id: Mapped[str] = mapped_column(String(128), nullable=False, default="researcher")
    star_rating: Mapped[float] = mapped_column(Float, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    response = relationship("AIResponse", backref="baseline_ratings")
