"""OpenAI-compatible LLM API 클라이언트 (Gemini / OpenAI / Custom)."""

from __future__ import annotations

import random
import time
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.core.request_context import (
    get_effective_llm_base_url,
    get_effective_llm_model,
    get_llm_api_key_override,
)


class LLMClientError(RuntimeError):
    pass


class LLMClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings_override = settings

    @property
    def settings(self) -> Settings:
        # 매 호출마다 최신 설정을 읽어, 캐시/경로 이슈를 줄인다.
        return self._settings_override or get_settings()

    def _ensure_api_key(self) -> str:
        # 프론트 TopNav에서 전달한 X-LLM-API-Key가 있으면 서버 .env보다 우선
        override = get_llm_api_key_override()
        if override and override not in {"your_api_key_here", "your_gemini_api_key_here"}:
            return override

        api_key = (self.settings.llm_api_key or "").strip()
        if not api_key or api_key in {"your_api_key_here", "your_gemini_api_key_here"}:
            raise LLMClientError(
                "LLM_API_KEY가 설정되지 않았습니다. "
                "상단 API 설정에 키를 입력하거나 backend/.env를 설정하세요."
            )
        return api_key

    def resolve_model(self, model: str | None = None) -> str:
        if model and model.strip():
            return model.strip()
        return get_effective_llm_model(self.settings.llm_model)

    def resolve_base_url(self) -> str:
        return get_effective_llm_base_url(self.settings.llm_base_url)

    def provider_label(self, base_url: str | None = None) -> str:
        url = (base_url or self.resolve_base_url()).lower()
        if "generativelanguage.googleapis.com" in url:
            return "Gemini"
        if "api.openai.com" in url:
            return "OpenAI"
        return "LLM"

    def chat_completion(
        self,
        *,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        model: str | None = None,
        response_format: dict[str, Any] | None = None,
        timeout: float = 90.0,
        max_retries: int = 5,
    ) -> str:
        api_key = self._ensure_api_key()
        base_url = self.resolve_base_url()
        resolved_model = self.resolve_model(model)
        payload: dict[str, Any] = {
            "model": resolved_model,
            "messages": messages,
            "temperature": (
                self.settings.llm_temperature if temperature is None else temperature
            ),
        }
        # Gemini OpenAI 호환 엔드포인트도 json_object를 지원하지만,
        # 일부 모델/버전에서 거절될 수 있어 호출부에서 재시도한다.
        if response_format is not None:
            payload["response_format"] = response_format

        provider = self.provider_label(base_url)
        last_detail = ""

        for attempt in range(max_retries + 1):
            try:
                with httpx.Client(timeout=timeout) as client:
                    response = client.post(
                        f"{base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json=payload,
                    )
            except httpx.TimeoutException as exc:
                raise LLMClientError("LLM API 요청이 시간 초과되었습니다.") from exc
            except httpx.HTTPError as exc:
                raise LLMClientError(f"LLM API 네트워크 오류: {exc}") from exc

            if response.status_code in {429, 503} and attempt < max_retries:
                retry_after = response.headers.get("Retry-After")
                try:
                    wait_s = float(retry_after) if retry_after else 0.0
                except ValueError:
                    wait_s = 0.0
                if wait_s <= 0:
                    # 지수 백오프 + 지터 (약 2s → 4s → 8s …)
                    wait_s = min(60.0, (2 ** attempt) * 2.0) + random.uniform(0.2, 1.0)
                time.sleep(wait_s)
                last_detail = response.text[:300]
                continue

            if response.status_code >= 400:
                detail = response.text[:500]
                if response.status_code == 429:
                    raise LLMClientError(
                        f"{provider} API 호출 한도(429)에 걸렸습니다. "
                        "질문 1건당 LLM을 6번 호출하므로 잠시(1~2분) 기다린 뒤 "
                        "한 질문씩 다시 실행하세요. "
                        f"상세: {detail}"
                    )
                raise LLMClientError(
                    f"{provider} API 오류 ({response.status_code}): {detail}"
                )

            try:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError, ValueError) as exc:
                raise LLMClientError("LLM API 응답 형식이 올바르지 않습니다.") from exc

            # 일부 응답에서 content가 list(parts)로 올 수 있음
            if isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, str):
                        parts.append(part)
                    elif isinstance(part, dict) and "text" in part:
                        parts.append(str(part["text"]))
                content = "".join(parts)

            if not isinstance(content, str) or not content.strip():
                raise LLMClientError("LLM API가 빈 응답을 반환했습니다.")
            return content.strip()

        raise LLMClientError(
            f"{provider} API 호출 한도(429/503) 재시도 후에도 실패했습니다. {last_detail}"
        )
