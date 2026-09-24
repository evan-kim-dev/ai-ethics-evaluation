def test_researcher_gate_locks_admin_when_password_set(client, clean_db, monkeypatch):
    monkeypatch.setenv("RESEARCHER_PASSWORD", "thesis-admin")
    from app.core.config import reload_settings

    reload_settings()

    status = client.get("/api/researcher/status")
    assert status.status_code == 200
    assert status.json()["password_configured"] is True
    assert status.json()["unlocked"] is False

    blocked = client.post("/api/rater-accounts")
    assert blocked.status_code == 401

    wrong = client.post("/api/researcher/login", json={"password": "nope"})
    assert wrong.status_code == 401

    ok = client.post("/api/researcher/login", json={"password": "thesis-admin"})
    assert ok.status_code == 200
    token = ok.json()["token"]

    unlocked = client.get(
        "/api/researcher/status",
        headers={"X-Researcher-Token": token},
    )
    assert unlocked.json()["unlocked"] is True

    issued = client.post(
        "/api/rater-accounts",
        headers={"X-Researcher-Token": token},
    )
    assert issued.status_code == 201
    assert issued.json()["evaluator_id"].startswith("R-")
