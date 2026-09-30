# Backend

졸업논문 연구용 FastAPI 백엔드입니다.

## 실행 방법

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

# .env에 Gemini API 키 설정
# LLM_API_KEY=...
# LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
# LLM_MODEL=gemini-2.0-flash

uvicorn app.main:app --reload --port 8000
```

API 문서: http://localhost:8000/docs  
헬스체크: http://localhost:8000/api/health

Gemini API 키: [Google AI Studio](https://aistudio.google.com/apikey)

## Phase 1–2 구현 범위

- FastAPI 앱 + CORS
- SQLite + SQLAlchemy
- Question CRUD (`/api/questions`)
- 샘플 질문 seed (`data/sample_questions.csv`)

## Phase 3 구현 범위

- AI 응답 수동 저장 (`POST /api/responses`)
- HumanEvaluation CRUD
- 위험도 계산 (`scoring.py`) 및 RiskResult 저장
- EvaluationPage에서 인간 평가·위험도·레이더 차트

## Phase 4 구현 범위

- `POST /api/responses/generate` — 조건별 LLM 응답 생성
- `POST /api/responses/{id}/llm-evaluation` — LLM-as-a-Judge
- LLMEvaluation 별도 테이블 저장
- 인간 평가 우선 / LLM 임시 위험도 규칙

## 근거 기반 buddhist_guided 프롬프트

AI 윤리 원칙 본문은 템플릿에 그대로 두고, 연기·자비·무아 블록만 문헌 발췌로 채웁니다.

```bash
python -m app.scripts.build_grounded_prompt
```

- 템플릿: `app/prompts/buddhist_guided_system.txt`
- 생성본(런타임): `app/prompts/buddhist_guided_system.generated.txt`
- 문헌 목록·Drive 동기화: `app/references/README.md`

Drive 폴더 `김기훈_논문_AI윤리`의 저작권 PDF는 `app/references/drive/`에만 두고 커밋하지 않습니다.

## Phase 5 구현 범위

- `POST /api/experiments/run-question/{id}` — 두 조건 동시 실험
- `GET /api/experiments/{id}/comparison`
- Dashboard summary / domain / condition / results / CSV
