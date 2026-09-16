from datetime import datetime, timezone
import secrets

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_share_token() -> str:
    return secrets.token_urlsafe(16)


class RatingShareLink(Base):
    """Baseline 응답 공개 평가용 공유 링크."""

    __tablename__ = "rating_share_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
        default=generate_share_token,
    )
    response_id: Mapped[int] = mapped_column(
        ForeignKey("ai_responses.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    response = relationship("AIResponse", backref="rating_share_link")
