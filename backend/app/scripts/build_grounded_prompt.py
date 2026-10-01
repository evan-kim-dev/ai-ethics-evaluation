"""OA/공식 문헌을 파싱해 buddhist_guided 시스템 프롬프트를 생성한다.

사용:
    cd backend && python -m app.scripts.build_grounded_prompt
"""

from __future__ import annotations

import argparse
from pathlib import Path

from app.services.reference_grounding import (
    DEFAULT_CLAIMS_JSON,
    DEFAULT_MANIFEST,
    DEFAULT_OUTPUT,
    DEFAULT_TEMPLATE,
    write_grounded_prompt,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="문헌 발췌로 buddhist_guided 시스템 프롬프트를 생성합니다."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--claims-json", type=Path, default=DEFAULT_CLAIMS_JSON)
    args = parser.parse_args(argv)
    output, claims = write_grounded_prompt(
        manifest_path=args.manifest,
        template_path=args.template,
        output_path=args.output,
        claims_json_path=args.claims_json,
    )
    concepts = ", ".join(f"{claim.concept}:{claim.source_id}" for claim in claims)
    print(f"wrote {output} ({len(claims)} claims: {concepts})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
