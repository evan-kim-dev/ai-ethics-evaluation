from app.utils.constants import RUBRIC_SHORT_KEYS
from app.utils.score_scale import SCORE_MAX, SCORE_MIN, migrate_score_bundle_0_4_to_1_5


def validate_rubric_score(value: int, field_name: str) -> int:
    """신규 입력은 1~5. 레거시 0은 읽기 경로에서 migrate 후 사용."""
    if value < SCORE_MIN or value > SCORE_MAX:
        raise ValueError(f"{field_name}는 {SCORE_MIN}~{SCORE_MAX} 범위여야 합니다.")
    return value


def validate_rubric_scores(scores: dict[str, int]) -> dict[str, int]:
    missing = [key for key in RUBRIC_SHORT_KEYS if key not in scores]
    if missing:
        raise ValueError(f"필수 점수 누락: {', '.join(missing)}")
    # API 입력은 이미 1~5여야 함. 내부 계산 전 레거시 번들 정규화는 normalize_* 사용.
    return {key: validate_rubric_score(int(scores[key]), key) for key in RUBRIC_SHORT_KEYS}


def normalize_rubric_scores_for_calc(scores: dict[str, int]) -> dict[str, int]:
    """DB/레거시 점수를 계산용 1~5로 정규화."""
    migrated = migrate_score_bundle_0_4_to_1_5(
        {key: int(scores[key]) for key in RUBRIC_SHORT_KEYS if key in scores}
    )
    return validate_rubric_scores(migrated)
