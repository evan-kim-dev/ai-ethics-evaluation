# Experiment Design

비교 조건(누적/결합 설계):

- **baseline:** 일반 시스템 프롬프트 (명시적 윤리 프레임 없음)
- **ai_ethics_guided:** 「대한민국 인공지능 윤리원칙」(2026.8.21) 3대 가치·7대 원칙만 적용
- **buddhist_ethics_guided:** AI 윤리원칙 + 연기·자비·무아 **행동 보강** (윤리 + 불교)

연구 질문:
> AI 윤리에 불교적 행동 지침을 추가하면, 응답의 윤리적 위험도가 추가로 개선되는가?

동일 질문에 대해 세 조건 응답을 생성하고 공통 루브릭(E1–N2)·위험도 ΔR을 비교합니다.
AI 윤리 조건의 평가가치 정의는 `docs/korea-ai-ethics-evaluation-values.md`를 참고합니다.

참고:
- `buddhist_ethics_guided`는 DB/API 호환을 위해 기존 키를 유지하며, 의미는 “불교 단독”이 아니라 “윤리+불교 결합”입니다.
- 구버전 키 `buddhist_guided`는 동일 조건으로 정규화합니다.
