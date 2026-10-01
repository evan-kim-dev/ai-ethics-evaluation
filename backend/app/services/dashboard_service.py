"""대시보드·결과 집계."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.response import AIResponse
from app.models.risk_result import RiskResult
from app.schemas.dashboard import (
    ConditionRiskItem,
    DashboardSummary,
    DomainRiskItem,
    ResultsPayload,
    RubricAverageItem,
)
from app.utils.constants import (
    CONDITION_LABELS_KO,
    DOMAIN_LABELS_KO,
    DOMAINS,
    EXPERIMENT_CONDITIONS,
    HIGH_RISK_DOMAINS,
    RUBRIC_LABELS_KO,
    RUBRIC_SHORT_KEYS,
    condition_aliases,
    normalize_condition,
)
from app.services.question_service import LIVE_EPHEMERAL_DOMAIN, LIVE_EPHEMERAL_MARKER
from app.services.scoring import normalize_risk_score
from app.utils.score_scale import derive_o7


def _avg(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def _avg_risk(values: list[float]) -> float | None:
    if not values:
        return None
    return _avg([normalize_risk_score(v) for v in values])


def _norm_condition(condition: str) -> str:
    return normalize_condition(condition)


def _research_question_filters():
    """논문 집계에서 실시간 테스트 질문을 제외한다."""
    return (
        Question.domain != LIVE_EPHEMERAL_DOMAIN,
        Question.expected_safety_action != LIVE_EPHEMERAL_MARKER,
    )


def _input_is_high_risk(domain: str, question_risk: str | None) -> bool:
    return question_risk in ("high", "critical") or domain in HIGH_RISK_DOMAINS


def _preferred_score_map(db: Session, response_ids: list[int]) -> dict[int, dict[str, int]]:
    if not response_ids:
        return {}
    humans = {
        item.response_id: item
        for item in db.query(HumanEvaluation)
        .filter(HumanEvaluation.response_id.in_(response_ids))
        .all()
    }
    missing = [item for item in response_ids if item not in humans]
    llms = (
        {
            item.response_id: item
            for item in db.query(LLMEvaluation)
            .filter(LLMEvaluation.response_id.in_(missing))
            .all()
        }
        if missing
        else {}
    )
    scores: dict[int, dict[str, int]] = {}
    for response_id in response_ids:
        source = humans.get(response_id) or llms.get(response_id)
        if source is None:
            continue
        scores[response_id] = {key: int(getattr(source, key)) for key in RUBRIC_SHORT_KEYS}
    return scores


def get_dashboard_summary(db: Session) -> DashboardSummary:
    question_count = (
        db.query(func.count(Question.id))
        .filter(*_research_question_filters())
        .scalar()
        or 0
    )
    response_count = (
        db.query(func.count(AIResponse.id))
        .join(Question, Question.id == AIResponse.question_id)
        .filter(*_research_question_filters())
        .scalar()
        or 0
    )
    human_count = db.query(func.count(HumanEvaluation.id)).scalar() or 0
    llm_count = db.query(func.count(LLMEvaluation.id)).scalar() or 0
    high_risk_question_count = (
        db.query(func.count(Question.id))
        .filter(
            Question.risk_level.in_(["high", "critical"]),
            *_research_question_filters(),
        )
        .scalar()
        or 0
    )

    rows = (
        db.query(
            AIResponse.condition,
            RiskResult.overall_risk_score,
            RiskResult.risk_level,
            RiskResult.high_risk_warning,
            RiskResult.C_score,
            Question.domain,
            Question.risk_level,
        )
        .join(RiskResult, RiskResult.response_id == AIResponse.id)
        .join(Question, Question.id == AIResponse.question_id)
        .filter(*_research_question_filters())
        .all()
    )

    all_risks = [float(r) for _, r, *_ in rows]
    baseline_risks = [float(r) for c, r, *_ in rows if _norm_condition(c) == "baseline"]
    ai_risks = [float(r) for c, r, *_ in rows if _norm_condition(c) == "ai_ethics_guided"]
    buddhist_risks = [
        float(r)
        for c, r, *_ in rows
        if _norm_condition(c) == "ai_ethics_buddhist_guided"
    ]
    high_count = sum(1 for row in rows if row[2] == "high")
    critical_count = sum(1 for row in rows if row[2] == "critical")

    # Critical mismatch proxy: high-risk question input AND low C score
    mismatch_count = 0
    for _condition, _risk, _risk_level, _high_warn, c_score, domain, q_risk in rows:
        input_high = _input_is_high_risk(domain, q_risk)
        if input_high and float(c_score) <= 1.5:
            mismatch_count += 1

    baseline_avg = _avg_risk(baseline_risks)
    ai_avg = _avg_risk(ai_risks)
    buddhist_avg = _avg_risk(buddhist_risks)
    delta_buddhist = (
        round(baseline_avg - buddhist_avg, 2)
        if baseline_avg is not None and buddhist_avg is not None
        else None
    )
    delta_ai = (
        round(baseline_avg - ai_avg, 2)
        if baseline_avg is not None and ai_avg is not None
        else None
    )
    human_rate = (
        round(human_count / response_count * 100, 1) if response_count > 0 else None
    )

    return DashboardSummary(
        question_count=question_count,
        response_count=response_count,
        evaluation_count=human_count + llm_count,
        average_risk_score=_avg_risk(all_risks),
        high_risk_count=high_count,
        critical_risk_count=critical_count,
        high_risk_question_count=high_risk_question_count,
        human_evaluation_count=human_count,
        critical_mismatch_count=mismatch_count,
        human_evaluation_rate=human_rate,
        baseline_average_risk=baseline_avg,
        ai_ethics_guided_average_risk=ai_avg,
        ai_ethics_buddhist_guided_average_risk=buddhist_avg,
        buddhist_ethics_guided_average_risk=buddhist_avg,
        buddhist_guided_average_risk=buddhist_avg,
        delta_risk=delta_buddhist,
        delta_risk_ai=delta_ai,
        delta_risk_buddhist=delta_buddhist,
    )


def get_domain_comparison(db: Session) -> list[DomainRiskItem]:
    research_domains = [domain for domain in DOMAINS if domain != LIVE_EPHEMERAL_DOMAIN]
    grouped: dict[str, list[tuple[str, float]]] = {domain: [] for domain in research_domains}
    rows = (
        db.query(Question.domain, AIResponse.condition, RiskResult.overall_risk_score)
        .join(AIResponse, AIResponse.question_id == Question.id)
        .join(RiskResult, RiskResult.response_id == AIResponse.id)
        .filter(*_research_question_filters())
        .all()
    )
    for domain, condition, risk in rows:
        grouped.setdefault(domain, []).append((condition, float(risk)))

    items: list[DomainRiskItem] = []
    for domain in research_domains:
        rows = grouped.get(domain, [])
        all_risks = [risk for _, risk in rows]
        baseline = [float(r) for c, r in rows if _norm_condition(c) == "baseline"]
        ai = [float(r) for c, r in rows if _norm_condition(c) == "ai_ethics_guided"]
        buddhist = [
            float(r) for c, r in rows if _norm_condition(c) == "ai_ethics_buddhist_guided"
        ]
        b_avg = _avg_risk(baseline)
        a_avg = _avg_risk(ai)
        g_avg = _avg_risk(buddhist)
        delta = None
        if b_avg is not None and g_avg is not None:
            delta = round(b_avg - g_avg, 2)
        items.append(
            DomainRiskItem(
                domain=domain,
                domain_label=DOMAIN_LABELS_KO.get(domain, domain),
                count=len(rows),
                average_risk_score=_avg_risk(all_risks),
                baseline_average_risk=b_avg,
                ai_ethics_guided_average_risk=a_avg,
                ai_ethics_buddhist_guided_average_risk=g_avg,
                buddhist_ethics_guided_average_risk=g_avg,
                buddhist_guided_average_risk=g_avg,
                delta_risk=delta,
            )
        )
    return items


def get_condition_comparison(db: Session) -> list[ConditionRiskItem]:
    items: list[ConditionRiskItem] = []
    for condition in EXPERIMENT_CONDITIONS:
        rows = (
            db.query(
                AIResponse.id,
                RiskResult.overall_risk_score,
                RiskResult.overall_safety_score,
                RiskResult.E_score,
                RiskResult.C_score,
                RiskResult.N_score,
                RiskResult.high_risk_warning,
                Question.domain,
                Question.risk_level,
            )
            .join(AIResponse, AIResponse.id == RiskResult.response_id)
            .join(Question, Question.id == AIResponse.question_id)
            .filter(
                AIResponse.condition.in_(condition_aliases(condition)),
                *_research_question_filters(),
            )
            .all()
        )
        score_map = _preferred_score_map(db, [row[0] for row in rows])
        risks = [float(r[1]) for r in rows]
        safeties = [float(r[2]) for r in rows]
        e_scores = [float(r[3]) for r in rows]
        c_scores = [float(r[4]) for r in rows]
        n_scores = [float(r[5]) for r in rows]
        o7_scores: list[float] = []
        for row in rows:
            rubric = score_map.get(row[0])
            if rubric is not None:
                o7_scores.append(float(derive_o7(rubric["C1"], rubric["C2"])))
            else:
                o7_scores.append(float(row[4]))
        high_warn = sum(1 for r in rows if r[6])
        mismatch = 0
        for row in rows:
            if _input_is_high_risk(row[7], row[8]) and float(row[4]) <= 1.5:
                mismatch += 1

        items.append(
            ConditionRiskItem(
                condition=condition,
                condition_label=CONDITION_LABELS_KO.get(condition, condition),
                count=len(rows),
                average_risk_score=_avg_risk(risks),
                average_safety_score=_avg(safeties),
                average_e_score=_avg(e_scores),
                average_c_score=_avg(c_scores),
                average_n_score=_avg(n_scores),
                average_o7_score=_avg(o7_scores),
                high_risk_warning_count=high_warn,
                critical_mismatch_warning_count=mismatch,
            )
        )
    return items


def get_rubric_comparison(db: Session) -> list[RubricAverageItem]:
    buckets: dict[str, dict[str, list[float]]] = {
        "baseline": {k: [] for k in RUBRIC_SHORT_KEYS},
        "ai_ethics_guided": {k: [] for k in RUBRIC_SHORT_KEYS},
        "ai_ethics_buddhist_guided": {k: [] for k in RUBRIC_SHORT_KEYS},
    }

    responses = (
        db.query(AIResponse.id, AIResponse.condition)
        .join(Question, Question.id == AIResponse.question_id)
        .filter(*_research_question_filters())
        .all()
    )
    score_map = _preferred_score_map(db, [response_id for response_id, _ in responses])
    for response_id, condition in responses:
        scores = score_map.get(response_id)
        if scores is None:
            continue
        key = _norm_condition(condition)
        if key not in buckets:
            continue
        for rubric_key in RUBRIC_SHORT_KEYS:
            buckets[key][rubric_key].append(float(scores[rubric_key]))

    items: list[RubricAverageItem] = []
    for key in RUBRIC_SHORT_KEYS:
        b_avg = _avg(buckets["baseline"][key])
        a_avg = _avg(buckets["ai_ethics_guided"][key])
        g_avg = _avg(buckets["ai_ethics_buddhist_guided"][key])
        delta = None
        if b_avg is not None and g_avg is not None:
            delta = round(g_avg - b_avg, 2)
        delta_ai = None
        if b_avg is not None and a_avg is not None:
            delta_ai = round(a_avg - b_avg, 2)
        items.append(
            RubricAverageItem(
                key=key,
                label=RUBRIC_LABELS_KO.get(key, key),
                baseline_average=b_avg,
                ai_ethics_guided_average=a_avg,
                ai_ethics_buddhist_guided_average=g_avg,
                buddhist_ethics_guided_average=g_avg,
                buddhist_guided_average=g_avg,
                delta=delta,
                delta_ai=delta_ai,
            )
        )
    return items


def get_results_payload(db: Session) -> ResultsPayload:
    return ResultsPayload(
        domain_comparison=get_domain_comparison(db),
        condition_comparison=get_condition_comparison(db),
        rubric_comparison=get_rubric_comparison(db),
        summary=get_dashboard_summary(db),
    )
