from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings, reload_settings
from app.core.database import SessionLocal, init_db
from app.core.sqlite_store import persist_sqlite
from app.core.request_context import (
    get_effective_llm_base_url,
    get_effective_llm_model,
    get_llm_api_key_override,
    get_llm_base_url_override,
    get_llm_model_override,
    llm_api_key_override,
    llm_base_url_override,
    llm_model_override,
)
from app.routers import dashboard, evaluations, experiments, questions, rater_accounts, researcher, responses
from app.services.seed_data import seed_questions_from_csv

SAMPLE_CSV_PATH = Path(__file__).resolve().parents[2] / "data" / "sample_questions.csv"


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = reload_settings()
    init_db()
    if settings.seed_on_startup:
        db = SessionLocal()
        try:
            seed_questions_from_csv(db, SAMPLE_CSV_PATH)
        finally:
            db.close()
    yield


app = FastAPI(
    title="AI Ethics Evaluation API",
    description="불교 윤리 기반 프롬프트의 윤리적 위험도 평가를 위한 연구용 MVP API",
    version="0.1.0",
    lifespan=lifespan,
)


def _cors_origins() -> list[str]:
    return get_settings().cors_origin_list


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"https://ai-ethics-evaluation.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LlmRuntimeMiddleware(BaseHTTPMiddleware):
    """요청 헤더의 LLM 키/모델/베이스 URL을 요청 스코프 ContextVar로 전달한다."""

    async def dispatch(self, request: Request, call_next):
        key_token = llm_api_key_override.set(
            (request.headers.get("X-LLM-API-Key") or "").strip() or None
        )
        model_token = llm_model_override.set(
            (request.headers.get("X-LLM-Model") or "").strip() or None
        )
        base_token = llm_base_url_override.set(
            (request.headers.get("X-LLM-Base-URL") or "").strip() or None
        )
        try:
            response = await call_next(request)
            if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
                persist_sqlite()
            return response
        finally:
            llm_api_key_override.reset(key_token)
            llm_model_override.reset(model_token)
            llm_base_url_override.reset(base_token)


app.add_middleware(LlmRuntimeMiddleware)

app.include_router(questions.router, prefix="/api")
app.include_router(responses.router, prefix="/api")
app.include_router(evaluations.router, prefix="/api")
app.include_router(rater_accounts.router, prefix="/api")
app.include_router(researcher.router, prefix="/api")
app.include_router(experiments.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/api/health")
def health_check() -> dict[str, object]:
    settings = get_settings()
    header_key = get_llm_api_key_override()
    model_override = get_llm_model_override()
    base_override = get_llm_base_url_override()
    effective_model = get_effective_llm_model(settings.llm_model)
    effective_base = get_effective_llm_base_url(settings.llm_base_url)
    return {
        "status": "ok",
        "env": settings.app_env,
        "llm_configured": settings.has_llm_api_key or bool(header_key),
        "llm_configured_via_header": bool(header_key),
        "llm_model": effective_model,
        "llm_base_url": effective_base,
        "llm_model_via_header": bool(model_override),
        "llm_base_url_via_header": bool(base_override),
    }
