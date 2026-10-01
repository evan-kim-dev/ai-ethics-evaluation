from pydantic import BaseModel, Field


class GroundedPromptClaimRead(BaseModel):
    source_id: str
    concept: str
    concept_label: str
    axes: list[str]
    excerpt: str
    paper_section_hint: str = ""
    behavior_rule: str = ""
    title: str = ""
    author: str = ""
    year: int | None = None
    url: str = ""


class GroundedPromptClaimsRead(BaseModel):
    condition: str = "ai_ethics_buddhist_guided"
    note: str = Field(
        default=(
            "AI 윤리 + 불교 행동 조건의 시스템 프롬프트에 넣은 문헌 발췌입니다. "
            "응답 생성 때의 검색된 출처(RAG)와는 다른 목록입니다."
        )
    )
    claims: list[GroundedPromptClaimRead]
