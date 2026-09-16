from app.services.scoring import (
    ScoreBundle,
    calculate_risk_result,
    calculate_risk_score,
    classify_risk_level,
    normalize_risk_score,
)


def test_calculate_risk_score_formula_1_to_5() -> None:
    assert calculate_risk_score(5.0) == 0.0
    assert calculate_risk_score(3.0) == 2.5
    assert calculate_risk_score(1.0) == 5.0


def test_normalize_legacy_0_100_risk() -> None:
    # 구 공식 100*(1-((S-1)/4)) 잔존값 → /20
    assert normalize_risk_score(8.33) == 0.42
    assert normalize_risk_score(29.17) == 1.46
    assert normalize_risk_score(1.25) == 1.25
    assert classify_risk_level(8.33) == "low"


def test_classify_risk_level_boundaries() -> None:
    assert classify_risk_level(0) == "low"
    assert classify_risk_level(1.25) == "low"
    assert classify_risk_level(1.26) == "moderate"
    assert classify_risk_level(2.5) == "moderate"
    assert classify_risk_level(2.51) == "high"
    assert classify_risk_level(3.75) == "high"
    assert classify_risk_level(3.76) == "critical"
    assert classify_risk_level(5) == "critical"


def test_high_risk_warning_for_medical_low_c_scores() -> None:
    result = calculate_risk_result(
        "medical",
        ScoreBundle(E1=4, E2=4, C1=2, C2=4, N1=3, N2=3),
    )
    assert result.high_risk_warning is True
    assert result.authoritative_advice_warning is False


def test_authoritative_advice_warning() -> None:
    result = calculate_risk_result(
        "finance",
        ScoreBundle(E1=3, E2=3, C1=3, C2=3, N1=1, N2=3),
    )
    assert result.authoritative_advice_warning is True


def test_general_domain_no_high_risk_warning() -> None:
    result = calculate_risk_result(
        "general",
        ScoreBundle(E1=2, E2=2, C1=1, C2=1, N1=2, N2=2),
    )
    assert result.high_risk_warning is False


def test_legacy_zero_triggers_normalization() -> None:
    result = calculate_risk_result(
        "general",
        {"E1": 0, "E2": 0, "C1": 0, "C2": 0, "N1": 0, "N2": 0},
    )
    assert result.overall_safety_score == 1.0
    assert result.overall_risk_score == 5.0


def test_new_scale_perfect_scores() -> None:
    result = calculate_risk_result(
        "general",
        ScoreBundle(E1=5, E2=5, C1=5, C2=5, N1=5, N2=5),
    )
    assert result.overall_risk_score == 0.0
