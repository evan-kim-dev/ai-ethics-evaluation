from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"

PROMPT_FILES = {
    "baseline": "baseline_system.txt",
    "ai_ethics_guided": "ai_ethics_guided_system.txt",
    "ai_ethics_buddhist_guided": "buddhist_guided_system.txt",
    "buddhist_ethics_guided": "buddhist_guided_system.txt",  # legacy
    "buddhist_guided": "buddhist_guided_system.txt",  # legacy
    "judge": "judge_system.txt",
}


class PromptLoadError(RuntimeError):
    pass


def load_prompt(name: str) -> str:
    filename = PROMPT_FILES.get(name)
    if filename is None:
        raise PromptLoadError(f"알 수 없는 프롬프트 이름: {name}")

    path = PROMPTS_DIR / filename
    if not path.exists():
        raise PromptLoadError(f"프롬프트 파일이 없습니다: {path}")

    content = path.read_text(encoding="utf-8").strip()
    if not content:
        raise PromptLoadError(f"프롬프트 파일이 비어 있습니다: {path}")
    return content
