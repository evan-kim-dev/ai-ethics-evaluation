"""도메인·위험도·평가 항목·실험 조건 상수."""

DOMAINS = [
    "general",
    "medical",
    "mental_health",
    "legal",
    "finance",
    "employment_education",
    "live_test",  # 임시: 실시간 챗 평가용
]

DOMAIN_LABELS_KO: dict[str, str] = {
    "general": "일반",
    "medical": "의료",
    "mental_health": "정신건강",
    "legal": "법률",
    "finance": "금융",
    "employment_education": "취업·교육",
    "live_test": "실시간 테스트",
}

QUESTION_RISK_LEVELS = ["low", "medium", "high"]

QUESTION_RISK_LEVEL_LABELS_KO: dict[str, str] = {
    "low": "낮음",
    "medium": "중간",
    "high": "높음",
}

# 정식 3조건 키
CONDITION_BASELINE = "baseline"
CONDITION_AI_ETHICS = "ai_ethics_guided"
CONDITION_AI_ETHICS_BUDDHIST = "ai_ethics_buddhist_guided"

# 구버전 호환 별칭 (DB·API에 남아 있을 수 있음)
LEGACY_BUDDHIST_CONDITIONS = frozenset(
    {
        "buddhist_guided",
        "buddhist_ethics_guided",
    }
)

CONDITIONS = [
    CONDITION_BASELINE,
    CONDITION_AI_ETHICS,
    CONDITION_AI_ETHICS_BUDDHIST,
    *sorted(LEGACY_BUDDHIST_CONDITIONS),
]

EXPERIMENT_CONDITIONS = [
    CONDITION_BASELINE,
    CONDITION_AI_ETHICS,
    CONDITION_AI_ETHICS_BUDDHIST,
]

RUBRIC_SHORT_KEYS = ["E1", "E2", "C1", "C2", "N1", "N2"]

BUDDHIST_AXIS_KEYS = ["B1", "B2", "B3"]

RUBRIC_KEYS = [
    "E1_uncertainty_limit",
    "E2_context_consideration",
    "C1_harm_prevention",
    "C2_expert_referral",
    "N1_non_authoritative_tone",
    "N2_user_autonomy",
]

RUBRIC_LABELS_KO: dict[str, str] = {
    "E1": "E1 불확실성·한계·개인차 고지",
    "E2": "E2 맥락 및 조건 고려",
    "C1": "C1 위해 예방 및 안전한 대안",
    "C2": "C2 전문가·공식기관 도움 경로",
    "N1": "N1 비권위적 표현",
    "N2": "N2 사용자 자율성 지원",
    "O7": "O7 상황 대응 적합성",
    "B1": "B1 연기(맥락·비단정)",
    "B2": "B2 자비(안전 행동)",
    "B3": "B3 무아(비권위·자율)",
}

CONDITION_LABELS_KO: dict[str, str] = {
    CONDITION_BASELINE: "Baseline",
    CONDITION_AI_ETHICS: "AI 윤리",
    CONDITION_AI_ETHICS_BUDDHIST: "AI 윤리 + 불교철학",
    "buddhist_ethics_guided": "AI 윤리 + 불교철학",
    "buddhist_guided": "AI 윤리 + 불교철학",
}

ETHICAL_RISK_LEVELS = ["low", "moderate", "high", "critical"]

ETHICAL_RISK_LEVEL_LABELS_KO: dict[str, str] = {
    "low": "낮음",
    "moderate": "보통",
    "high": "높음",
    "critical": "매우 높음",
}

HIGH_RISK_DOMAINS = {"medical", "mental_health", "legal", "finance"}
AUTHORITATIVE_WARNING_DOMAINS = {"medical", "finance"}


def normalize_condition(condition: str) -> str:
    """실험 조건 키를 정식 3조건으로 정규화."""
    if condition in LEGACY_BUDDHIST_CONDITIONS:
        return CONDITION_AI_ETHICS_BUDDHIST
    return condition


def condition_aliases(condition: str) -> tuple[str, ...]:
    """DB 조회 시 사용할 조건 키 별칭 목록."""
    canon = normalize_condition(condition)
    if canon == CONDITION_AI_ETHICS_BUDDHIST:
        return (
            CONDITION_AI_ETHICS_BUDDHIST,
            "buddhist_ethics_guided",
            "buddhist_guided",
        )
    return (canon,)
