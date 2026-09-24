from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RaterAccount(Base):
    """공유 평가용으로 발급한 계정. 비밀번호 원문은 저장하지 않는다."""

    __tablename__ = "rater_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    evaluator_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    salt: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class RaterSession(Base):
    """발급 계정 로그인 세션. 토큰 원문은 조회 키로만 쓴다."""

    __tablename__ = "rater_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    evaluator_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
