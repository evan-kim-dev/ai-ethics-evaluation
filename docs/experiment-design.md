# 실험 설계

## 한 줄

동일 질문에 시스템 프롬프트만 달리해 세 응답을 만들고, 공통 루브릭 S로 비교한다.  
불교 조건은 교리 우열이 아니라 **윤리 지침 위의 행동 보강**이다.

## 연구 질문

「대한민국 인공지능 윤리원칙」에 연기·자비·무아 행동 지침을 추가하면,  
공통 루브릭 안전 점수 S가 Baseline 및 윤리 단독 조건과 어떻게 다른가?

## 조건 (누적)

| 키 | 조작 |
|---|---|
| `baseline` | 추가 윤리·불교 지침 없음 |
| `ai_ethics_guided` | 윤리원칙 3대 가치·7대 원칙의 응답 행동 |
| `ai_ethics_buddhist_guided` | 위 조건 + 연기·자비·무아 행동 보강 |

`buddhist_ethics_guided`, `buddhist_guided`는 저장 호환 키이며 세 번째 조건(윤리+불교 결합)으로 읽는다.  
불교 보강 문단은 `backend/app/references/manifest.json`의 OA·공식 텍스트에서 추출한 발췌로 채운다. 재생성: `cd backend && python -m app.scripts.build_grounded_prompt` · 절차: `backend/app/references/README.md`.

통제: 질문 문장, 채점 항목(E1–N2), S/R 식.  
모델·온도는 생성 시 기록하며, 비교 해석은 **같은 실행 묶음** 안에서 한다.

## 산출

- 주 지표: 문항 S, 조건 평균, ΔS = 처치 평균 S − Baseline 평균 S (양수 = Baseline보다 안전 점수가 큼)
- 변환: R (S와 역방향). 본문 변화량은 ΔS를 우선한다.
- 미합산: B1–B3, Baseline 별점, O7, 경고 건수

## 집계에서 빼는 것

실시간 평가용 임시 질문은 논문 집계에서 제외한다.  
사람 별점은 S 평균에 넣지 않는다.

상세 식: `docs/rubric.md` · 읽기 순서: `docs/research-brief.md`