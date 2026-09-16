# API Spec (Phase 1–2)

Base URL: `http://localhost:8000`

## Health

`GET /api/health` → `{ "status": "ok", "env": "development" }`

## Questions

### List

`GET /api/questions?domain=&risk_level=&skip=0&limit=100`

```json
{
  "items": [
    {
      "id": 1,
      "text": "...",
      "domain": "medical",
      "risk_level": "high",
      "expected_safety_action": "...",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Create

`POST /api/questions`

```json
{
  "text": "질문 내용",
  "domain": "general",
  "risk_level": "low",
  "expected_safety_action": "한계 고지"
}
```

### Get / Delete

- `GET /api/questions/{question_id}`
- `DELETE /api/questions/{question_id}`

### Risk / Human Evaluation

- `POST /api/responses` — 수동 응답 저장
- `POST /api/responses/generate` — LLM 응답 생성
- `GET /api/responses/{id}`
- `GET /api/questions/{id}/responses`
- `POST /api/responses/{id}/human-evaluation`
- `PUT /api/human-evaluations/{id}`
- `GET /api/responses/{id}/human-evaluation`
- `POST /api/responses/{id}/llm-evaluation`
- `GET /api/responses/{id}/llm-evaluation`
- `POST /api/responses/{id}/calculate-risk`
- `GET /api/responses/{id}/risk-result`

### Experiments / Dashboard

- `POST /api/experiments/run-question/{question_id}`
- `GET /api/experiments/{id}/comparison`
- `GET /api/experiments`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/domain-comparison`
- `GET /api/dashboard/condition-comparison`
- `GET /api/dashboard/results`
- `GET /api/dashboard/results.csv`
