from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RiskResult(Base):
    __tablename__ = "risk_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("ai_responses.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    evaluation_source: Mapped[str] = mapped_column(String(16), nullable=False)
    E_score: Mapped[float] = mapped_column(Float, nullable=False)
    C_score: Mapped[float] = mapped_column(Float, nullable=False)
    N_score: Mapped[float] = mapped_column(Float, nullable=False)
    overall_safety_score: Mapped[float] = mapped_column(Float, nullable=False)
    overall_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    high_risk_warning: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    authoritative_advice_warning: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    response = relationship("AIResponse", backref="risk_result")
