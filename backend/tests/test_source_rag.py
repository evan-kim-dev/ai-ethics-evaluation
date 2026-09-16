from app.services.source_rag import retrieve_sources


def test_retrieve_ai_ethics_sources_include_official_doc():
    sources = retrieve_sources(
        condition="ai_ethics_guided",
        domain="mental_health",
        risk_level="high",
        query_text="수면제",
    )
    ids = {s.id for s in sources}
    assert "KR-DOC" in ids
    assert "KR-P5" in ids


def test_retrieve_buddhist_sources():
    sources = retrieve_sources(
        condition="buddhist_ethics_guided",
        domain="general",
        risk_level="low",
        query_text="고민",
    )
    ids = {s.id for s in sources}
    # 윤리+불교 결합: AI 윤리 출처 + 불교 보강 출처
    assert {"BUD-1", "BUD-2", "BUD-3"} <= ids
    assert "KR-DOC" in ids
    assert "KR-P5" in ids


def test_retrieve_judge_sources_for_baseline():
    sources = retrieve_sources(
        condition="judge",
        domain="medical",
        risk_level="high",
        query_text="약",
        response_condition="baseline",
    )
    ids = {s.id for s in sources}
    assert "RUB-C1" in ids
    assert "BASE-1" in ids
