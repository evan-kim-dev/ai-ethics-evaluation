from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AIResponse(Base):
    __tablename__ = "ai_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False, index=True)
    experiment_id: Mapped[int | None] = mapped_column(
        ForeignKey("experiments.id"),
        nullable=True,
        index=True,
    )
    condition: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False, default="manual")
    system_prompt_version: Mapped[str] = mapped_column(String(64), nullable=False, default="manual-v1")
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    generation_params_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    question = relationship("Question", backref="responses")
