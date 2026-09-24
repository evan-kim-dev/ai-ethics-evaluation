"""서버리스에서도 SQLite 파일을 읽고 쓸 수 있게 준비한다.

Vercel 함수 디스크는 읽기 전용이라, 번들에 포함된 DB를 /tmp로 복사한 뒤 연다.
BLOB_READ_WRITE_TOKEN이 있으면 그 복사본을 Blob에 올려 콜드 스타트 이후에도 유지한다.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import quote

import httpx

_BLOB_API = "https://vercel.com/api/blob"
_BLOB_NAME = "ai_ethics.db"
_active_path: Path | None = None


def prepare_sqlite_url(url: str) -> str:
    """대상 파일이 없으면 시드 또는 Blob에서 채운 SQLite URL을 돌려준다."""
    global _active_path
    target = _sqlite_path(url)
    if target is None:
        return url
    if target.exists() and target.stat().st_size > 0:
        _active_path = target
        return url

    target.parent.mkdir(parents=True, exist_ok=True)
    downloaded = _download_blob()
    seed = Path(__file__).resolve().parents[2] / "ai_ethics.db"
    if downloaded:
        target.write_bytes(downloaded)
    elif seed.exists():
        target.write_bytes(seed.read_bytes())
        _upload_blob(target)
    _active_path = target
    return "sqlite:///" + target.resolve().as_posix()


def persist_sqlite() -> None:
    """변경된 DB를 Blob에 다시 올린다. 토큰이 없으면 아무것도 하지 않는다."""
    if _active_path is None or not _active_path.exists():
        return
    _upload_blob(_active_path)


def _sqlite_path(url: str) -> Path | None:
    if not url.startswith("sqlite:///") or ":memory:" in url:
        return None
    raw = url.removeprefix("sqlite:///")
    path = Path(raw)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _blob_auth() -> tuple[str, str] | None:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
    if not token:
        return None
    parts = token.split("_")
    store_id = parts[3] if len(parts) > 3 else ""
    if not store_id:
        return None
    return token, store_id


def _download_blob() -> bytes | None:
    auth = _blob_auth()
    if auth is None:
        return None
    token, store_id = auth
    url = f"https://{store_id}.private.blob.vercel-storage.com/{_BLOB_NAME}"
    try:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
            follow_redirects=True,
        )
    except httpx.HTTPError:
        return None
    if response.status_code != 200 or not response.content:
        return None
    return response.content


def _rating_pathname(response_id: int, evaluator_id: str) -> str:
    evaluator = quote((evaluator_id or "researcher").strip() or "researcher", safe="")
    return f"baseline-ratings/{response_id}/{evaluator}.json"


def save_baseline_rating_blob(record: dict) -> bool:
    """별점 1건을 Blob에 올린다. 토큰이 없으면 SQLite만 쓰는 로컬 환경으로 보고 성공한다."""
    auth = _blob_auth()
    if auth is None:
        return True
    token, store_id = auth
    pathname = _rating_pathname(int(record["response_id"]), str(record["evaluator_id"]))
    try:
        response = httpx.put(
            f"{_BLOB_API}/?pathname={pathname}",
            content=json.dumps(record, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-version": "12",
                "x-vercel-blob-store-id": store_id,
                "x-vercel-blob-access": "private",
                "x-content-type": "application/json",
                "x-add-random-suffix": "0",
                "x-allow-overwrite": "1",
            },
            timeout=20.0,
        )
    except httpx.HTTPError:
        return False
    return response.status_code < 400


def read_baseline_rating_blob(response_id: int, evaluator_id: str) -> dict | None:
    auth = _blob_auth()
    if auth is None:
        return None
    token, store_id = auth
    pathname = _rating_pathname(response_id, evaluator_id)
    url = f"https://{store_id}.private.blob.vercel-storage.com/{pathname}"
    try:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15.0,
            follow_redirects=True,
        )
    except httpx.HTTPError:
        return None
    if response.status_code != 200 or not response.content:
        return None
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def list_baseline_rating_blobs(response_id: int) -> list[dict]:
    auth = _blob_auth()
    if auth is None:
        return []
    token, store_id = auth
    prefix = f"baseline-ratings/{response_id}/"
    try:
        response = httpx.get(
            _BLOB_API,
            params={"prefix": prefix},
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-version": "12",
            },
            timeout=20.0,
        )
    except httpx.HTTPError:
        return []
    if response.status_code != 200:
        return []
    try:
        blobs = response.json().get("blobs")
    except json.JSONDecodeError:
        return []
    if not isinstance(blobs, list):
        return []
    records: list[dict] = []
    for blob in blobs:
        if not isinstance(blob, dict):
            continue
        pathname = str(blob.get("pathname") or "")
        if not pathname.startswith(prefix):
            continue
        url = f"https://{store_id}.private.blob.vercel-storage.com/{pathname}"
        try:
            item = httpx.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
                follow_redirects=True,
            )
        except httpx.HTTPError:
            continue
        if item.status_code != 200:
            continue
        try:
            payload = item.json()
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            records.append(payload)
    return records


def delete_baseline_rating_blobs_for_response(response_id: int) -> None:
    """해당 응답의 별점 Blob을 모두 지운다. 실패해도 호출부를 막지 않는다."""
    auth = _blob_auth()
    if auth is None:
        return
    token, store_id = auth
    prefix = f"baseline-ratings/{response_id}/"
    try:
        response = httpx.get(
            _BLOB_API,
            params={"prefix": prefix},
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-version": "12",
            },
            timeout=20.0,
        )
    except httpx.HTTPError:
        return
    if response.status_code != 200:
        return
    try:
        blobs = response.json().get("blobs")
    except json.JSONDecodeError:
        return
    if not isinstance(blobs, list):
        return
    for blob in blobs:
        if not isinstance(blob, dict):
            continue
        url = str(blob.get("url") or "").strip()
        if not url:
            pathname = str(blob.get("pathname") or "").strip()
            if pathname:
                url = f"https://{store_id}.public.blob.vercel-storage.com/{pathname}"
        if not url:
            continue
        try:
            httpx.delete(
                _BLOB_API,
                params={"url": url},
                headers={
                    "Authorization": f"Bearer {token}",
                    "x-api-version": "12",
                },
                timeout=15.0,
            )
        except httpx.HTTPError:
            continue


def delete_baseline_rating_blob(response_id: int, evaluator_id: str) -> None:
    """별점 1건 Blob을 지운다."""
    auth = _blob_auth()
    if auth is None:
        return
    token, store_id = auth
    pathname = _rating_pathname(response_id, evaluator_id)
    url = f"https://{store_id}.private.blob.vercel-storage.com/{pathname}"
    # Prefer listed URL when available so delete matches the stored object.
    try:
        listed = httpx.get(
            _BLOB_API,
            params={"prefix": pathname},
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-version": "12",
            },
            timeout=15.0,
        )
        if listed.status_code == 200:
            blobs = listed.json().get("blobs")
            if isinstance(blobs, list):
                for blob in blobs:
                    if isinstance(blob, dict) and str(blob.get("pathname") or "") == pathname:
                        candidate = str(blob.get("url") or "").strip()
                        if candidate:
                            url = candidate
                        break
    except (httpx.HTTPError, json.JSONDecodeError, TypeError):
        pass
    try:
        httpx.delete(
            _BLOB_API,
            params={"url": url},
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-version": "12",
            },
            timeout=15.0,
        )
    except httpx.HTTPError:
        return


def list_all_baseline_rating_blobs() -> list[dict]:
    """모든 응답의 별점 Blob을 모은다."""
    auth = _blob_auth()
    if auth is None:
        return []
    token, store_id = auth
    prefix = "baseline-ratings/"
    try:
        response = httpx.get(
            _BLOB_API,
            params={"prefix": prefix},
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-version": "12",
            },
            timeout=30.0,
        )
    except httpx.HTTPError:
        return []
    if response.status_code != 200:
        return []
    try:
        blobs = response.json().get("blobs")
    except json.JSONDecodeError:
        return []
    if not isinstance(blobs, list):
        return []
    records: list[dict] = []
    for blob in blobs:
        if not isinstance(blob, dict):
            continue
        pathname = str(blob.get("pathname") or "")
        if not pathname.startswith(prefix) or not pathname.endswith(".json"):
            continue
        url = f"https://{store_id}.private.blob.vercel-storage.com/{pathname}"
        try:
            item = httpx.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
                follow_redirects=True,
            )
        except httpx.HTTPError:
            continue
        if item.status_code != 200:
            continue
        try:
            payload = item.json()
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            records.append(payload)
    return records


def save_json_blob(pathname: str, record: dict) -> bool:
    """JSON 한 건을 Blob에 올린다. 토큰이 없으면 로컬 SQLite만 쓰는 것으로 보고 성공한다."""
    auth = _blob_auth()
    if auth is None:
        return True
    token, store_id = auth
    try:
        response = httpx.put(
            f"{_BLOB_API}/?pathname={pathname}",
            content=json.dumps(record, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-version": "12",
                "x-vercel-blob-store-id": store_id,
                "x-vercel-blob-access": "private",
                "x-content-type": "application/json",
                "x-add-random-suffix": "0",
                "x-allow-overwrite": "1",
            },
            timeout=20.0,
        )
    except httpx.HTTPError:
        return False
    return response.status_code < 400


def read_json_blob(pathname: str) -> dict | None:
    auth = _blob_auth()
    if auth is None:
        return None
    token, store_id = auth
    url = f"https://{store_id}.private.blob.vercel-storage.com/{pathname}"
    try:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15.0,
            follow_redirects=True,
        )
    except httpx.HTTPError:
        return None
    if response.status_code != 200 or not response.content:
        return None
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _account_pathname(evaluator_id: str) -> str:
    return f"rater-accounts/{quote(evaluator_id.strip(), safe='')}.json"


def _session_pathname(token: str) -> str:
    return f"rater-sessions/{quote(token, safe='')}.json"


def save_rater_account_blob(record: dict) -> bool:
    return save_json_blob(_account_pathname(str(record["evaluator_id"])), record)


def read_rater_account_blob(evaluator_id: str) -> dict | None:
    return read_json_blob(_account_pathname(evaluator_id))


def save_rater_session_blob(token: str, record: dict) -> bool:
    return save_json_blob(_session_pathname(token), record)


def read_rater_session_blob(token: str) -> dict | None:
    return read_json_blob(_session_pathname(token))


def _upload_blob(path: Path) -> None:
    auth = _blob_auth()
    if auth is None:
        return
    token, store_id = auth
    try:
        httpx.put(
            f"{_BLOB_API}/?pathname={_BLOB_NAME}",
            content=path.read_bytes(),
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-version": "12",
                "x-vercel-blob-store-id": store_id,
                "x-vercel-blob-access": "private",
                "x-content-type": "application/octet-stream",
                "x-add-random-suffix": "0",
                "x-allow-overwrite": "1",
            },
            timeout=60.0,
        )
    except httpx.HTTPError:
        return
