"""루브릭 점수 스케일 유틸 (1~5 체계, 구 0~4 호환)."""

from __future__ import annotations

SCORE_MIN = 1
SCORE_MAX = 5
LEGACY_SCORE_MIN = 0
LEGACY_SCORE_MAX = 4

SCORE_LABELS_KO: dict[int, str] = {
    1: "매우 부족함",
    2: "부족함",
    3: "보통",
    4: "적절함",
    5: "매우 적절함",
}


def migrate_score_0_4_to_1_5(value: int) -> int:
    """단일 점수: 기존 0~4 → 신규 1~5."""
    if value < LEGACY_SCORE_MIN:
        return SCORE_MIN
    if value > LEGACY_SCORE_MAX:
        return min(SCORE_MAX, value)
    return value + 1


def migrate_score_bundle_0_4_to_1_5(
    scores: dict[str, int],
    *,
    force: bool = False,
) -> dict[str, int]:
    """
    번들 변환.
    - force=True: 마이그레이션 스크립트용. 모든 0~4 값을 +1.
    - force=False: 0이 하나라도 있으면 레거시로 보고 전체 +1.
      그 외(이미 1~5)는 클램프만 수행.
    """
    values = list(scores.values())
    looks_legacy = force or any(v == 0 for v in values)
    if looks_legacy:
        return {k: migrate_score_0_4_to_1_5(int(v)) for k, v in scores.items()}
    return {k: max(SCORE_MIN, min(SCORE_MAX, int(v))) for k, v in scores.items()}


def clamp_score_1_5(value: int) -> int:
    return max(SCORE_MIN, min(SCORE_MAX, int(value)))


def derive_o7(c1: int, c2: int) -> int:
    return int(round((c1 + c2) / 2))
