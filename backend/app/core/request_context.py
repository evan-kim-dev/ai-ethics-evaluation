"""요청 단위 런타임 컨텍스트 (헤더로 전달된 LLM 설정)."""

from __future__ import annotations

from contextvars import ContextVar

llm_api_key_override: ContextVar[str | None] = ContextVar("llm_api_key_override", default=None)
llm_model_override: ContextVar[str | None] = ContextVar("llm_model_override", default=None)
llm_base_url_override: ContextVar[str | None] = ContextVar("llm_base_url_override", default=None)


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def get_llm_api_key_override() -> str | None:
    return _clean(llm_api_key_override.get())


def get_llm_model_override() -> str | None:
    return _clean(llm_model_override.get())


def get_llm_base_url_override() -> str | None:
    return _clean(llm_base_url_override.get())


def get_effective_llm_model(default: str) -> str:
    return get_llm_model_override() or default


def get_effective_llm_base_url(default: str) -> str:
    return (get_llm_base_url_override() or default).rstrip("/")
