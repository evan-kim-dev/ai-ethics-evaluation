"""실험 실행: baseline + AI 윤리 + (AI 윤리+불교) 3조건 생성·평가."""

from __future__ import annotations

import time

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.experiment import Experiment
from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.response import AIResponse
from app.models.risk_result import RiskResult
from app.schemas.experiment import (
    ConditionComparisonSide,
    ExperimentComparison,
    ExperimentRead,
)
from app.services.llm_client import LLMClientError
from app.services.llm_judge import LLMJudge, LLMJudgeError
from app.services.response_generator import ResponseGenerator
from app.services.risk_service import resolve_and_store_risk
from app.utils.constants import (
    EXPERIMENT_CONDITIONS,
    normalize_condition,
)


def interpret_delta(delta: float | None, label: str) -> str | None:
    if delta is None:
        return None
    if delta > 0:
        return f"{label} 적용 후 윤리 대응 점수(S) 향상"
    if delta < 0:
        return f"{label} 적용 후 윤리 대응 점수(S) 하락"
    return "윤리 대응 점수(S) 변화 없음"


def _side_payload(db: Session, response: AIResponse | None) -> ConditionComparisonSide | None:
    if response is None:
        return None
    llm = (
        db.query(LLMEvaluation)
        .filter(LLMEvaluation.response_id == response.id)
        .one_or_none()
    )
    human = (
        db.query(HumanEvaluation)
        .filter(HumanEvaluation.response_id == response.id)
        .one_or_none()
    )
    risk = (
        db.query(RiskResult)
        .filter(RiskResult.response_id == response.id)
        .one_or_none()
    )
    condition = normalize_condition(response.condition)
    return ConditionComparisonSide(
        condition=condition,  # type: ignore[arg-type]
        response=response,
        llm_evaluation=llm,
        human_evaluation=human,
        risk_result=risk,
    )


def _pick(
    responses: list[AIResponse],
    *names: str,
) -> AIResponse | None:
    wanted = {normalize_condition(n) for n in names}
    # prefer exact then normalized
    for name in names:
        for r in responses:
            if r.condition == name:
                return r
    for r in responses:
        if normalize_condition(r.condition) in wanted:
            return r
    return None


def build_comparison(db: Session, experiment: Experiment) -> ExperimentComparison:
    responses = (
        db.query(AIResponse)
        .filter(AIResponse.experiment_id == experiment.id)
        .order_by(AIResponse.id.asc())
        .all()
    )
    baseline = _pick(responses, "baseline")
    ai = _pick(responses, "ai_ethics_guided")
    buddhist = _pick(
        responses,
        "ai_ethics_buddhist_guided",
        "buddhist_ethics_guided",
        "buddhist_guided",
    )

    baseline_side = _side_payload(db, baseline)
    ai_side = _side_payload(db, ai)
    buddhist_side = _side_payload(db, buddhist)

    def safety_of(side: ConditionComparisonSide | None) -> float | None:
        if side and side.risk_result:
            return float(side.risk_result.overall_safety_score)
        return None

    def risk_of(side: ConditionComparisonSide | None) -> float | None:
        if side and side.risk_result:
            return float(side.risk_result.overall_risk_score)
        return None

    b_s = safety_of(baseline_side)
    a_s = safety_of(ai_side)
    g_s = safety_of(buddhist_side)

    # API 호환: delta_risk_* 필드는 계속 반환하되, 의미는 baseline_S - treatment_S가 아니라
    # 기존과 같이 baseline_R - treatment_R (양수면 위험 감소). UI는 S를 우선 사용.
    b_risk = risk_of(baseline_side)
    a_risk = risk_of(ai_side)
    g_risk = risk_of(buddhist_side)

    delta_ai = round(b_risk - a_risk, 2) if b_risk is not None and a_risk is not None else None
    delta_buddhist = (
        round(b_risk - g_risk, 2) if b_risk is not None and g_risk is not None else None
    )

    candidates: list[tuple[str, float]] = []
    if b_s is not None:
        candidates.append(("baseline", b_s))
    if a_s is not None:
        candidates.append(("ai_ethics_guided", a_s))
    if g_s is not None:
        candidates.append(("ai_ethics_buddhist_guided", g_s))
    # 최고 윤리 대응 점수(S) 조건
    safest = max(candidates, key=lambda x: x[1])[0] if candidates else None

    return ExperimentComparison(
        experiment=ExperimentRead.model_validate(experiment),
        question_id=experiment.question_id
        or (baseline.question_id if baseline else 0),
        baseline=baseline_side,
        ai_ethics_guided=ai_side,
        ai_ethics_buddhist_guided=buddhist_side,
        buddhist_ethics_guided=buddhist_side,
        buddhist_guided=buddhist_side,
        delta_risk_ai=delta_ai,
        delta_risk_buddhist=delta_buddhist,
        delta_risk=delta_buddhist,
        delta_interpretation=interpret_delta(
            (round(g_s - b_s, 2) if b_s is not None and g_s is not None else None),
            "AI 윤리 + 불교철학",
        ),
        safest_condition=safest,
    )


class ExperimentRunner:
    def __init__(
        self,
        generator: ResponseGenerator | None = None,
        judge: LLMJudge | None = None,
    ) -> None:
        self.settings = get_settings()
        self.generator = generator or ResponseGenerator()
        self.judge = judge or LLMJudge()

    def run_question(
        self,
        db: Session,
        *,
        question: Question,
        run_llm_judge: bool = True,
        name: str | None = None,
        description: str = "",
    ) -> ExperimentComparison:
        experiment = Experiment(
            name=name or f"Q{question.id} 3조건 윤리 비교",
            description=description
            or f"질문 #{question.id} baseline / AI 윤리 / 불교 윤리 비교 실험",
            model_name=self.generator.llm_client.resolve_model(),
            temperature=self.settings.llm_temperature,
            question_id=question.id,
        )
        db.add(experiment)
        db.commit()
        db.refresh(experiment)

        try:
            for index, condition in enumerate(EXPERIMENT_CONDITIONS):
                if index > 0:
                    # Gemini 분당 한도(RPM) 완화용 짧은 간격
                    time.sleep(1.5)
                generated = self.generator.generate(
                    db,
                    question=question,
                    condition=condition,
                    experiment_id=experiment.id,
                )
                if run_llm_judge:
                    self.judge.evaluate(
                        db,
                        question=question,
                        response=generated.response,
                    )
                    resolve_and_store_risk(db, generated.response)
                    time.sleep(1.0)
        except (LLMClientError, LLMJudgeError, ValueError):
            raise

        return build_comparison(db, experiment)
