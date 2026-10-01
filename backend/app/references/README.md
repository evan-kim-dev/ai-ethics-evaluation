# 근거 문헌 (reference grounding)

`buddhist_guided` 시스템 프롬프트의 [B] 불교 보강과 [출처]는 여기 문헌을 **파싱한 짧은 발췌**로 채웁니다. 서지 제목만 붙이지 않습니다.

[A] 대한민국 AI 윤리원칙 본문은 `app/prompts/buddhist_guided_system.txt`에 사람이 유지합니다. 불교 쪽은 그 원칙을 낮추지 않는 **추가 행동**(E1/E2, C1/C2, N1/N2)으로만 번역됩니다.

## 저장소에 포함된 OA·공식 자료

| ID | 자료 | 라이선스 |
|---|---|---|
| `BUD-Laukkonen-2025` | Laukkonen et al., *Contemplative Artificial Intelligence*, arXiv:2504.15125 | CC BY 4.0 |
| `BUD-Bombaerts-2024` | Bombaerts, Hannes, et al., *From an attention economy to an ecology of attending*, arXiv:2410.17421 | CC BY 4.0 |
| `KR-ETHICS-2026` | 「대한민국 인공지능 윤리원칙」(2026.8.21.) 추출본 `docs/korea-ai-ethics-principles-extracted.txt` | 정부 공개 원칙 |

원문 URL은 `manifest.json`에 있습니다. arXiv PDF는 재현을 위해 `pdfs/`에 두었고, 저작권은 저자에게 있습니다.

개념 매핑:

- 연기 (`dependent_origination`) → 맥락·비단정·한계 (E1·E2)
- 자비 (`compassion`) → 위해 최소화·구체적 도움 경로 (C1·C2)
- 무아 (`non_self`) → 비권위·사용자 자율 (N1·N2)

## 재생성

```bash
cd backend
python -m app.scripts.build_grounded_prompt
```

저장소 루트에서는 `make grounded-prompt`.

생성물:

- `app/prompts/buddhist_guided_system.generated.txt` — 런타임 시스템 프롬프트
- `app/references/grounded_claims.json` — `source_id`, `concept`, `quote`(40단어 이하), `paraphrase_behavior_rule`, `paper_section_hint`

템플릿의 `{{GROUNDED_*}}` 를 고친 뒤에는 위 명령을 다시 실행하세요. `prompt_loader`는 generated 파일이 있으면 그 파일을 읽습니다.

## Google Drive `김기훈_논문_AI윤리` 동기화

연구자가 모아 둔 PDF는 Drive 폴더 이름 `김기훈_논문_AI윤리`에 있습니다. **OA·공식 문헌 또는 연구자가 적법하게 보유한 파일만** 사용합니다. Sci-Hub 등 불법 사본은 넣지 않습니다. Harvey 2000처럼 출판사 저작권이 있는 단행본 전문은 저장소에 커밋하지 않습니다.

1. Drive에서 필요한 PDF만 내려받습니다.
2. `backend/app/references/drive/`에 넣습니다. 이 디렉터리는 git에 올라가지 않습니다.
3. `manifest.json`의 `sources`에 항목을 추가합니다.

```json
{
  "id": "BUD-Author-Year",
  "author": "Family name et al.",
  "year": 2000,
  "title": "Paper title",
  "pdf_path": "drive/example.pdf",
  "url": "https://...",
  "license": "publisher / all-rights-reserved — local copy only",
  "oa": false,
  "concepts": ["dependent_origination"]
}
```

`concepts`는 `dependent_origination`, `compassion`, `non_self`, `korea_ai_ethics`만 허용합니다.

4. `python -m app.scripts.build_grounded_prompt`를 실행합니다.
5. 생성된 프롬프트의 발췌가 40단어 이하인지, ID가 원문 구간에 대응하는지 확인합니다. 발췌가 들어간 generated 파일과 `grounded_claims.json`만 커밋하고, `drive/` PDF는 커밋하지 않습니다.

텍스트만 있는 자료는 `pdf_path` 대신 `text_path`를 쓸 수 있습니다. 쪽 표시는 `===== PAGE 3 =====` 또는 `- 3 -` 입니다.
