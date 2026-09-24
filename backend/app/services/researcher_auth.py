"""연구자(관리) 화면 로그인.

RESEARCHER_PASSWORD가 설정된 경우에만 대시보드·관리 API를 연다.
비밀번호 원문은 저장하지 않고, 세션 토큰만 남긴다.
"""

from __future__ import annotations

import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.sqlite_store import read_json_blob, save_json_blob
from app.models.researcher_session import ResearcherSession

_SESSION_DAYS = 14


def _session_pathname(token: str) -> str:
    return f"researcher-sessions/{token}.json"


def _stamp(value: datetime | str | None) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and value:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        return datetime.min.replace(tzinfo=timezone.utc)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def password_configured() -> bool:
    return bool((get_settings().researcher_password or "").strip())


def login_researcher(db: Session, password: str) -> tuple[str, datetime]:
    expected = (get_settings().researcher_password or "").strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="연구자 비밀번호가 서버에 설정되지 않았습니다.",
        )
    if not hmac.compare_digest(expected, password):
        raise HTTPException(status_code=401, detail="연구자 비밀번호가 올바르지 않습니다.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=_SESSION_DAYS)
    row = ResearcherSession(token=token, expires_at=expires_at)
    db.add(row)
    db.commit()
    record = {"token": token, "expires_at": expires_at.isoformat()}
    if not save_json_blob(_session_pathname(token), record):
        db.delete(row)
        db.commit()
        raise HTTPException(status_code=503, detail="로그인 세션을 저장하지 못했습니다. 다시 시도해 주세요.")
    return token, expires_at


def assert_researcher(db: Session, token: str | None) -> None:
    """관리 화면·발급 API는 연구자 세션이 있어야 한다. 비밀번호 미설정(로컬)이면 통과."""
    if not password_configured():
        return
    cleaned = (token or "").strip()
    session = read_json_blob(_session_pathname(cleaned)) if cleaned else None
    if session is None and cleaned:
        row = db.query(ResearcherSession).filter(ResearcherSession.token == cleaned).one_or_none()
        if row is not None:
            session = {"expires_at": row.expires_at.isoformat()}
    if session is None:
        raise HTTPException(status_code=401, detail="연구자 로그인이 필요합니다.")
    if _stamp(session.get("expires_at")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="연구자 로그인이 만료되었습니다. 다시 로그인해 주세요.")


def is_researcher(db: Session, token: str | None) -> bool:
    try:
        assert_researcher(db, token)
        return True
    except HTTPException:
        return False
