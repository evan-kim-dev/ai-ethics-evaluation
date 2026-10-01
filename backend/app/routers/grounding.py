from fastapi import APIRouter, HTTPException

from app.schemas.grounding import GroundedPromptClaimRead, GroundedPromptClaimsRead
from app.services.reference_grounding import GroundingError, load_grounded_prompt_claims

router = APIRouter(prefix="/grounded-prompt-claims", tags=["grounding"])


@router.get("", response_model=GroundedPromptClaimsRead)
def read_grounded_prompt_claims() -> GroundedPromptClaimsRead:
    """결합 조건 시스템 프롬프트에 실제로 넣은 발췌. PDF 원문은 내려주지 않는다."""
    try:
        rows = load_grounded_prompt_claims()
    except GroundingError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return GroundedPromptClaimsRead(
        claims=[GroundedPromptClaimRead.model_validate(row) for row in rows]
    )
