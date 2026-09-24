"""조건별 AI 응답 생성."""

from __future__ import annotations

import json
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.question import Question
from app.models.response import AIResponse
from app.services.llm_client import LLMClient, LLMClientError
from app.services.prompt_loader import PromptLoadError, load_prompt
from app.services.source_rag import (
    CITATION_INSTRUCTION,
    format_sources_block,
    retrieve_sources,
    sources_as_dicts,
)
from app.utils.constants import CONDITIONS, DOMAIN_LABELS_KO


@dataclass
class GenerationResult:
    response: AIResponse
    system_prompt: str


class ResponseGenerator:
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self.llm_client = llm_client or LLMClient()

    def generate(
        self,
        db: Session,
        *,
        question: Question,
        condition: str,
        experiment_id: int | None = None,
    ) -> GenerationResult:
        if condition not in CONDITIONS:
            raise ValueError(f"유효하지 않은 condition: {condition}")

        settings = get_settings()
        resolve_model = getattr(self.llm_client, "resolve_model", None)
        active_model = resolve_model() if callable(resolve_model) else settings.llm_model
        try:
            system_prompt = load_prompt(condition)
        except PromptLoadError as exc:
            raise LLMClientError(str(exc)) from exc

        sources = retrieve_sources(
            condition=condition,
            domain=question.domain,
            risk_level=question.risk_level,
            query_text=question.text,
        )
        sources_block = format_sources_block(sources)
        system_with_rag = f"{system_prompt}\n\n{CITATION_INSTRUCTION}\n\n{sources_block}"

        domain_label = DOMAIN_LABELS_KO.get(question.domain, question.domain)
        user_prompt = (
            f"질문 분야: {domain_label} ({question.domain})\n\n"
            f"사용자 질문:\n{question.text}\n\n"
            "위 질문에 답하고, 검색된 출처 ID를 문장에 인용한 뒤 "
            "맨 아래에 '## 참고 출처' 목록을 작성하세요."
        )

        try:
            answer = self.llm_client.chat_completion(
                messages=[
                    {"role": "system", "content": system_with_rag},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=settings.llm_temperature,
                model=active_model,
            )
        except LLMClientError:
            raise

        params = {
            "temperature": settings.llm_temperature,
            "model": active_model,
            "base_url": (
                self.llm_client.resolve_base_url()
                if callable(getattr(self.llm_client, "resolve_base_url", None))
                else settings.llm_base_url
            ),
            "condition": condition,
            "rag": True,
            "retrieved_sources": sources_as_dicts(sources),
        }
        response = AIResponse(
            question_id=question.id,
            experiment_id=experiment_id,
            condition=condition,
            model_name=active_model,
            system_prompt_version=f"{condition}-v2-rag",
            response_text=answer,
            generation_params_json=json.dumps(params, ensure_ascii=False),
        )
        db.add(response)
        db.commit()
        db.refresh(response)
        return GenerationResult(response=response, system_prompt=system_with_rag)
