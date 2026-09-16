from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# uvicorn 실행 위치와 무관하게 backend/.env를 읽도록 절대경로 사용
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """애플리케이션 환경 설정. API 키는 환경변수/.env에서만 읽는다."""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    app_env: str = "development"
    database_url: str = "sqlite:///./ai_ethics.db"
    cors_origins: str = "http://localhost:5173"

    # Gemini (OpenAI-compatible endpoint)
    llm_api_key: str = ""
    llm_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"
    llm_model: str = "gemini-3.1-pro-preview"
    llm_temperature: float = 1.0

    seed_on_startup: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_gemini(self) -> bool:
        return "generativelanguage.googleapis.com" in self.llm_base_url.lower()

    @property
    def has_llm_api_key(self) -> bool:
        key = (self.llm_api_key or "").strip()
        return bool(key) and key not in {"your_api_key_here", "your_gemini_api_key_here"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reload_settings() -> Settings:
    """설정 캐시를 비우고 .env를 다시 읽는다."""
    get_settings.cache_clear()
    return get_settings()
