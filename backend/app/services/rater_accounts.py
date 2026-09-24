"""공유 평가 계정 발급·로그인.

비밀번호는 PBKDF2 해시만 남긴다. 서버리스에서 인스턴스가 달라도 맞도록
계정과 세션은 Blob에도 기록한다.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.sqlite_store import (
    read_rater_account_blob,
    read_rater_session_blob,
    save_rater_account_blob,
    save_rater_session_blob,
)
from app.models.rater_account import RaterAccount, RaterSession

_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_SESSION_DAYS = 30


def _code(length: int) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


def _hash_password(password: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return digest.hex()


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


def _account_from_row(row: RaterAccount) -> dict:
    return {
        "evaluator_id": row.evaluator_id,
        "password_hash": row.password_hash,
        "salt": row.salt,
        "created_at": row.created_at.isoformat(),
    }


def load_account(db: Session, evaluator_id: str) -> dict | None:
    cleaned = evaluator_id.strip()
    if not cleaned:
        return None
    blob = read_rater_account_blob(cleaned)
    if blob and blob.get("password_hash") and blob.get("salt"):
        return blob
    row = db.query(RaterAccount).filter(RaterAccount.evaluator_id == cleaned).one_or_none()
    if row is None:
        return None
    return _account_from_row(row)


def issue_account(db: Session) -> tuple[str, str]:
    for _ in range(8):
        evaluator_id = f"R-{_code(6)}"
        if load_account(db, evaluator_id) is not None:
            continue
        password = _code(8)
        salt = secrets.token_hex(16)
        row = RaterAccount(
            evaluator_id=evaluator_id,
            password_hash=_hash_password(password, salt),
            salt=salt,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        if not save_rater_account_blob(_account_from_row(row)):
            db.delete(row)
            db.commit()
            raise HTTPException(status_code=503, detail="평가 계정을 저장하지 못했습니다. 다시 발급해 주세요.")
        return evaluator_id, password
    raise HTTPException(status_code=503, detail="평가 계정을 만들지 못했습니다. 다시 시도해 주세요.")


def login_account(db: Session, evaluator_id: str, password: str) -> tuple[str, str, datetime]:
    account = load_account(db, evaluator_id)
    expected = str(account.get("password_hash")) if account else ""
    salt = str(account.get("salt")) if account else secrets.token_hex(16)
    actual = _hash_password(password, salt)
    matched = False
    if account is not None and len(expected) == len(actual):
        matched = hmac.compare_digest(expected, actual)
    if not matched:
        raise HTTPException(status_code=401, detail="평가자 ID 또는 비밀번호가 올바르지 않습니다.")

    evaluator = str(account["evaluator_id"])
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=_SESSION_DAYS)
    row = RaterSession(token=token, evaluator_id=evaluator, expires_at=expires_at)
    db.add(row)
    db.commit()
    record = {
        "token": token,
        "evaluator_id": evaluator,
        "expires_at": expires_at.isoformat(),
    }
    if not save_rater_session_blob(token, record):
        db.delete(row)
        db.commit()
        raise HTTPException(status_code=503, detail="로그인 세션을 저장하지 못했습니다. 다시 시도해 주세요.")
    return evaluator, token, expires_at


def assert_issued_rater(db: Session, evaluator_id: str, token: str | None) -> None:
    """발급된 계정이면 그 계정의 로그인 토큰이 있어야 별점을 저장할 수 있다."""
    account = load_account(db, evaluator_id)
    if account is None:
        return
    cleaned = (token or "").strip()
    session = read_rater_session_blob(cleaned) if cleaned else None
    if session is None and cleaned:
        row = db.query(RaterSession).filter(RaterSession.token == cleaned).one_or_none()
        if row is not None:
            session = {
                "evaluator_id": row.evaluator_id,
                "expires_at": row.expires_at.isoformat(),
            }
    if session is None or str(session.get("evaluator_id")) != str(account.get("evaluator_id")):
        raise HTTPException(status_code=401, detail="발급된 평가 계정으로 다시 로그인해 주세요.")
    if _stamp(session.get("expires_at")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="로그인이 만료되었습니다. 다시 로그인해 주세요.")
