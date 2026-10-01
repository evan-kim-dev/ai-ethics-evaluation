import json

from fastapi.testclient import TestClient

from app.services.reference_grounding import word_count


def test_grounded_prompt_claims_are_public_excerpts_without_pdf_paths(client: TestClient) -> None:
    response = client.get("/api/grounded-prompt-claims")
    assert response.status_code == 200
    body = response.json()
    assert "시스템 프롬프트" in body["note"]
    assert "RAG" in body["note"] or "검색된 출처" in body["note"]
    claims = body["claims"]
    assert claims

    by_source = {claim["source_id"] for claim in claims}
    assert "BUD-Laukkonen-2025" in by_source
    assert "BUD-Bombaerts-2024" in by_source
    assert "KR-ETHICS-2026" in by_source

    dependent = next(
        claim
        for claim in claims
        if claim["source_id"] == "BUD-Laukkonen-2025" and claim["concept"] == "dependent_origination"
    )
    assert dependent["axes"] == ["E1", "E2"]
    assert dependent["concept_label"] == "연기"
    assert dependent["paper_section_hint"]
    assert word_count(dependent["excerpt"]) <= 40
    assert dependent["excerpt"]

    compassion = next(claim for claim in claims if claim["concept"] == "compassion")
    assert compassion["axes"] == ["C1", "C2"]
    non_self = next(claim for claim in claims if claim["concept"] == "non_self")
    assert non_self["axes"] == ["N1", "N2"]
    ethics = next(claim for claim in claims if claim["source_id"] == "KR-ETHICS-2026")
    assert ethics["axes"] == ["E1", "E2", "C1", "C2", "N1", "N2"]

    blob = json.dumps(body, ensure_ascii=False)
    assert "pdf_path" not in blob
    assert "drive/" not in blob.lower()
    assert "drive\\" not in blob.lower()
