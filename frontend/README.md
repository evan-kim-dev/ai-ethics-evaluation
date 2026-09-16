# Frontend

연구용 대시보드 UI (React + TypeScript + Vite + Tailwind).

## 실행

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

http://localhost:5173

## 환경변수

```
VITE_API_BASE_URL=http://localhost:8000
```

## Phase 1–5 화면

- `/` 대시보드 통계·차트
- `/questions` 질문 관리
- `/evaluation` LLM 생성·예비평가·인간 최종평가
- `/experiment` baseline vs buddhist 비교·ΔR
- `/results` 도메인·조건·루브릭 비교·CSV
