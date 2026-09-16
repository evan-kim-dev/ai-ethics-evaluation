# AI Ethics Evaluation MVP

졸업논문 연구용 웹 MVP입니다.

**논문 주제:** 불교 윤리 기반 시스템 프롬프트가 생성형 AI 응답의 윤리적 위험도에 미치는 영향  
(루브릭 기반 평가 프레임워크 및 Human-in-the-Loop 프로토타입)

동일한 질문에 대해 `baseline`과 `buddhist_guided` 조건의 AI 응답을 생성·비교하고,  
6개 루브릭(E1, E2, C1, C2, N1, N2)으로 윤리 위험도를 평가합니다.

## 현재 구현 범위 (Phase 1–5)

- FastAPI + SQLite 백엔드
- Question CRUD, 샘플 시드
- AI 응답 수동 저장 / LLM 응답 생성
- LLM-as-a-Judge + 인간 최종평가
- baseline vs buddhist_guided 비교 실험
- 대시보드·분석 결과·CSV 다운로드

연구용 MVP 핵심 흐름이 연결되어 있습니다.

## 사전 요구사항

- Python 3.11+
- Node.js 20+
- npm

## Backend 실행

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux

uvicorn app.main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Frontend 실행

```bash
cd frontend
copy .env.example .env   # 이미 있으면 생략
npm install
npm run dev
```

- 앱: http://localhost:5173
- API Base URL: `VITE_API_BASE_URL` (기본 `http://localhost:8000`)

## 주요 API (Phase 2)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/questions` | 질문 목록 |
| POST | `/api/questions` | 질문 등록 |
| GET | `/api/questions/{id}` | 질문 단건 조회 |
| DELETE | `/api/questions/{id}` | 질문 삭제 |
| POST | `/api/questions/seed` | 샘플 질문 추가 |

## 프로젝트 구조

```
ai-ethics-evaluation/
├── backend/          # FastAPI
├── frontend/         # React + Vite
├── data/             # sample_questions.csv
└── docs/             # 연구/설계 문서
```

## 주의사항

- LLM API 키는 `backend/.env`에만 두고 코드에 하드코딩하지 않습니다.
- LLM 기능은 Phase 4에서 연결할 수 있도록 설정 항목만 미리 준비되어 있습니다.
