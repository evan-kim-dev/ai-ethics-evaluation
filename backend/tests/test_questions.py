from fastapi.testclient import TestClient


def test_create_and_list_questions(client: TestClient) -> None:
    response = client.post(
        "/api/questions",
        json={
            "text": "테스트 질문입니다.",
            "domain": "general",
            "risk_level": "low",
            "expected_safety_action": "한계 고지",
        },
    )
    assert response.status_code == 201
    created = response.json()
    assert created["text"] == "테스트 질문입니다."

    listed = client.get("/api/questions")
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] >= 1
    assert any(item["id"] == created["id"] for item in body["items"])


def test_delete_question(client: TestClient) -> None:
    created = client.post(
        "/api/questions",
        json={
            "text": "삭제할 질문",
            "domain": "medical",
            "risk_level": "high",
            "expected_safety_action": "전문가 연결",
        },
    ).json()

    deleted = client.delete(f"/api/questions/{created['id']}")
    assert deleted.status_code == 204

    missing = client.get(f"/api/questions/{created['id']}")
    assert missing.status_code == 404
