from pathlib import Path

from app.services.prompt_loader import load_prompt
from app.services.reference_grounding import (
    DEFAULT_MANIFEST,
    build_buddhist_guided_prompt,
    comparable_span,
    ground_claims,
    load_manifest,
    load_pages,
    normalize_ws,
    word_count,
)
from app.services.source_rag import retrieve_sources

FIXTURE_MANIFEST = Path(__file__).parent / "fixtures" / "grounding" / "manifest.json"
TEMPLATE = (
    Path(__file__).resolve().parents[1] / "app" / "prompts" / "buddhist_guided_system.txt"
)


def _source_text(manifest: Path, relative: str) -> str:
    return (manifest.parent / relative).read_text(encoding="utf-8")


def test_fixture_excerpts_skip_unrelated_sections_and_keep_ids():
    claims = ground_claims(FIXTURE_MANIFEST)
    by_concept = {claim.concept: claim for claim in claims}

    dependent = by_concept["dependent_origination"]
    assert dependent.source_id == "BUD-Fixture-2000"
    assert "dependent origination" in dependent.quote.lower()
    assert "400 participants" not in dependent.quote
    assert "p. 8" in dependent.paper_section_hint
    assert word_count(dependent.quote) <= 40
    assert normalize_ws(dependent.quote) in normalize_ws(
        _source_text(FIXTURE_MANIFEST, "dependent.txt")
    )

    compassion = by_concept["compassion"]
    assert compassion.source_id == "BUD-Fixture-Care-2010"
    assert "reduce suffering" in compassion.quote.lower()
    assert "room temperature" not in compassion.quote

    non_self = by_concept["non_self"]
    assert non_self.source_id == "BUD-Fixture-Anatta-1999"
    assert "non-self" in non_self.quote.lower()
    assert "database indexes" not in non_self.quote

    ethics = by_concept["korea_ai_ethics"]
    assert ethics.source_id == "KR-ETHICS-FIXTURE"
    assert "위해" in ethics.quote


def test_fixture_prompt_keeps_ethics_base_and_cites_excerpt_ids():
    prompt = build_buddhist_guided_prompt(
        manifest_path=FIXTURE_MANIFEST,
        template_path=TEMPLATE,
    )
    assert "대한민국 인공지능 윤리원칙" in prompt
    assert "AI 윤리를 약화하는 조건이 아니다" in prompt
    assert "[A]" in prompt
    assert "[B]" in prompt
    assert "{{GROUNDED_" not in prompt
    assert "[BUD-Fixture-2000]" in prompt
    assert "[BUD-Fixture-Care-2010]" in prompt
    assert "[BUD-Fixture-Anatta-1999]" in prompt
    assert "[KR-ETHICS-FIXTURE]" in prompt
    assert "dependent origination" in prompt.lower()
    assert "E1·E2" in prompt
    assert "C1·C2" in prompt
    assert "N1·N2" in prompt


def test_oa_manifest_quotes_are_real_spans_with_source_ids():
    claims = ground_claims(DEFAULT_MANIFEST, per_concept=1)
    concepts = {claim.concept for claim in claims}
    assert {
        "dependent_origination",
        "compassion",
        "non_self",
        "korea_ai_ethics",
    } <= concepts
    buddhist_ids = {claim.source_id for claim in claims if claim.concept != "korea_ai_ethics"}
    assert buddhist_ids <= {"BUD-Laukkonen-2025", "BUD-Bombaerts-2024"}
    assert any(claim.source_id == "KR-ETHICS-2026" for claim in claims)
    sources = {source.id: source for source in load_manifest(DEFAULT_MANIFEST)}
    page_cache: dict[str, str] = {}
    for claim in claims:
        if claim.source_id not in page_cache:
            blob = "\n".join(
                page.text for page in load_pages(sources[claim.source_id], DEFAULT_MANIFEST)
            )
            page_cache[claim.source_id] = comparable_span(blob)
        assert comparable_span(claim.quote) in page_cache[claim.source_id]
    for claim in claims:
        assert word_count(claim.quote) <= 40
        assert word_count(claim.quote) >= 8
        assert claim.quote
        assert claim.paraphrase_behavior_rule
        assert claim.paper_section_hint
        if claim.concept == "dependent_origination":
            assert "E1" in claim.paraphrase_behavior_rule
        elif claim.concept == "compassion":
            assert "C1" in claim.paraphrase_behavior_rule
        elif claim.concept == "non_self":
            assert "N1" in claim.paraphrase_behavior_rule
        else:
            assert "기본 프레임" in claim.paraphrase_behavior_rule


def test_generated_prompt_is_evidence_backed():
    prompt = load_prompt("buddhist_guided")
    assert "{{GROUNDED_" not in prompt
    assert "대한민국 인공지능 윤리원칙" in prompt
    assert "AI 윤리를 약화하는 조건이 아니다" in prompt
    assert "[BUD-Laukkonen-2025]" in prompt or "[BUD-Bombaerts-2024]" in prompt
    assert "[KR-ETHICS-2026]" in prompt
    assert "연구 지침" not in prompt.split("[출처]", 1)[-1]


def test_buddhist_retrieval_includes_grounded_source_ids():
    sources = retrieve_sources(
        condition="buddhist_ethics_guided",
        domain="general",
        risk_level="low",
        query_text="고민",
    )
    ids = {source.id for source in sources}
    assert {"BUD-1", "BUD-2", "BUD-3", "KR-DOC", "KR-P5"} <= ids
    assert "BUD-Laukkonen-2025" in ids or "BUD-Bombaerts-2024" in ids
