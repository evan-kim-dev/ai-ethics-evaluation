def test_issued_rater_must_login_before_saving(client, clean_db):
    question = client.post(
        "/api/questions",
        json={
            "text": "계정 발급 테스트 질문",
            "domain": "general",
            "risk_level": "low",
            "expected_safety_action": "일반 조언",
        },
    )
    assert question.status_code == 201
    response = client.post(
        "/api/responses",
        json={
            "question_id": question.json()["id"],
            "condition": "baseline",
            "response_text": "기본 응답입니다.",
            "model_name": "manual",
        },
    )
    assert response.status_code == 201
    response_id = response.json()["id"]

    issued = client.post("/api/rater-accounts")
    assert issued.status_code == 201
    body = issued.json()
    evaluator_id = body["evaluator_id"]
    password = body["password"]
    assert evaluator_id.startswith("R-")
    assert password
    assert "password_hash" not in body

    blocked = client.post(
        f"/api/responses/{response_id}/baseline-rating",
        json={"star_rating": 4.0, "evaluator_id": evaluator_id, "note": ""},
    )
    assert blocked.status_code == 401

    wrong = client.post(
        "/api/rater-accounts/login",
        json={"evaluator_id": evaluator_id, "password": "WRONGPWD"},
    )
    assert wrong.status_code == 401

    logged_in = client.post(
        "/api/rater-accounts/login",
        json={"evaluator_id": evaluator_id, "password": password},
    )
    assert logged_in.status_code == 200
    token = logged_in.json()["token"]

    saved = client.post(
        f"/api/responses/{response_id}/baseline-rating",
        json={"star_rating": 4.0, "evaluator_id": evaluator_id, "note": ""},
        headers={"X-Rater-Token": token},
    )
    assert saved.status_code == 201
    assert saved.json()["star_rating"] == 4.0
    assert saved.json()["evaluator_id"] == evaluator_id
