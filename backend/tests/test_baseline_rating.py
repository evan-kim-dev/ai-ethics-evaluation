def _create_baseline_response(client):
    q = client.post(
        "/api/questions",
        json={
            "text": "별점 테스트 질문",
            "domain": "general",
            "risk_level": "low",
            "expected_safety_action": "일반 조언",
        },
    )
    assert q.status_code == 201
    question_id = q.json()["id"]

    r = client.post(
        "/api/responses",
        json={
            "question_id": question_id,
            "condition": "baseline",
            "response_text": "기본 응답입니다.",
            "model_name": "manual",
        },
    )
    assert r.status_code == 201
    return question_id, r.json()["id"]


def test_baseline_star_rating_half_steps(client, clean_db):
    _, response_id = _create_baseline_response(client)

    bad = client.post(
        f"/api/responses/{response_id}/baseline-rating",
        json={"star_rating": 3.2, "note": "invalid"},
    )
    assert bad.status_code == 422

    created = client.post(
        f"/api/responses/{response_id}/baseline-rating",
        json={"star_rating": 3.5, "evaluator_id": "researcher", "note": "보통"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["star_rating"] == 3.5

    fetched = client.get(f"/api/responses/{response_id}/baseline-rating")
    assert fetched.status_code == 200
    assert fetched.json()["star_rating"] == 3.5

    updated = client.put(
        f"/api/baseline-ratings/{body['id']}",
        json={"star_rating": 4.0},
    )
    assert updated.status_code == 200
    assert updated.json()["star_rating"] == 4.0


def test_baseline_rating_rejects_non_baseline(client, clean_db):
    q = client.post(
        "/api/questions",
        json={
            "text": "비 baseline 별점 거부",
            "domain": "medical",
            "risk_level": "high",
            "expected_safety_action": "병원",
        },
    )
    question_id = q.json()["id"]
    r = client.post(
        "/api/responses",
        json={
            "question_id": question_id,
            "condition": "ai_ethics_guided",
            "response_text": "윤리 응답",
            "model_name": "manual",
        },
    )
    response_id = r.json()["id"]
    res = client.post(
        f"/api/responses/{response_id}/baseline-rating",
        json={"star_rating": 4.0},
    )
    assert res.status_code == 400


def test_share_link_multi_rater_public_flow(client, clean_db):
    _, response_id = _create_baseline_response(client)

    created = client.post(f"/api/responses/{response_id}/share-link")
    assert created.status_code == 201
    link = created.json()
    assert link["path"].startswith("/rate/")
    token = link["token"]

    again = client.post(f"/api/responses/{response_id}/share-link")
    assert again.status_code == 201
    assert again.json()["token"] == token

    page = client.get(f"/api/public/rate/{token}")
    assert page.status_code == 200
    assert page.json()["question_text"] == "별점 테스트 질문"
    assert page.json()["response_text"] == "기본 응답입니다."

    r1 = client.post(
        f"/api/public/rate/{token}",
        json={"evaluator_id": "R01", "star_rating": 4.0, "note": "괜찮음"},
    )
    assert r1.status_code == 201
    r2 = client.post(
        f"/api/public/rate/{token}",
        json={"evaluator_id": "R02", "star_rating": 3.5, "note": ""},
    )
    assert r2.status_code == 201

    # 같은 평가자 재제출은 업데이트
    r1b = client.post(
        f"/api/public/rate/{token}",
        json={"evaluator_id": "R01", "star_rating": 4.5, "note": "수정"},
    )
    assert r1b.status_code == 201
    assert r1b.json()["star_rating"] == 4.5
    assert r1b.json()["id"] == r1.json()["id"]

    listed = client.get(f"/api/responses/{response_id}/baseline-ratings")
    assert listed.status_code == 200
    items = listed.json()
    assert len(items) == 2
    by_eval = {item["evaluator_id"]: item["star_rating"] for item in items}
    assert by_eval["R01"] == 4.5
    assert by_eval["R02"] == 3.5

    meta = client.get(f"/api/responses/{response_id}/share-link")
    assert meta.status_code == 200
    assert meta.json()["rating_count"] == 2
