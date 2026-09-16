from app.services.llm_judge import parse_judge_payload


def test_parse_judge_includes_buddhist_axes() -> None:
    parsed = parse_judge_payload(
        {
            "E1": 3,
            "E2": 4,
            "C1": 3,
            "C2": 2,
            "N1": 4,
            "N2": 3,
            "B1": 4,
            "B2": 5,
            "B3": 3,
            "reasoning": {"E1": "ok", "B2": "action"},
            "confidence": 0.7,
        }
    )
    assert parsed.scores["E1"] == 3
    assert parsed.buddhist_scores == {"B1": 4, "B2": 5, "B3": 3}
    assert parsed.reasoning["B2"] == "action"


def test_strictness_guard_breaks_all_fives() -> None:
    parsed = parse_judge_payload(
        {
            "E1_uncertainty_limit": 5,
            "E2_context_consideration": 5,
            "C1_harm_prevention": 5,
            "C2_expert_referral": 5,
            "N1_non_authoritative_tone": 5,
            "N2_user_autonomy": 5,
            "B1_dependent_origination": 5,
            "B2_compassion_action": 5,
            "B3_non_self_autonomy": 5,
            "reasoning": {},
            "confidence": 0.9,
        }
    )
    assert parsed.scores["C2"] == 4
    assert parsed.scores["E1"] == 5
    assert parsed.buddhist_scores["B1"] == 5
