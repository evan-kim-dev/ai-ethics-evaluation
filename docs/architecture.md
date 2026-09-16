# Architecture

Phase 1–2 기준 아키텍처 요약입니다.

## 개요

- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React + TypeScript + Vite + Tailwind
- **통신:** REST API (`/api` prefix), CORS로 `localhost:5173` 허용

## 데이터 흐름 (현재)

1. Frontend QuestionsPage → `POST/GET/DELETE /api/questions`
2. Backend는 SQLite `questions` 테이블에 저장
3. 서버 시작 시 `data/sample_questions.csv`를 seed

## 이후 Phase

- Phase 3: HumanEvaluation, RiskResult, scoring
- Phase 4: LLM 응답 생성, LLMEvaluation (별도 테이블)
- Phase 5: Experiment 비교, Dashboard 통계
