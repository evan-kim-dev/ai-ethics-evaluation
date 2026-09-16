from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.dashboard import (
    ConditionRiskItem,
    DashboardSummary,
    DomainRiskItem,
    ResultsPayload,
)
from app.services.dashboard_service import (
    get_condition_comparison,
    get_dashboard_summary,
    get_domain_comparison,
    get_results_payload,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    return get_dashboard_summary(db)


@router.get("/domain-comparison", response_model=list[DomainRiskItem])
def domain_comparison(db: Session = Depends(get_db)) -> list[DomainRiskItem]:
    return get_domain_comparison(db)


@router.get("/condition-comparison", response_model=list[ConditionRiskItem])
def condition_comparison(db: Session = Depends(get_db)) -> list[ConditionRiskItem]:
    return get_condition_comparison(db)


@router.get("/results", response_model=ResultsPayload)
def results_payload(db: Session = Depends(get_db)) -> ResultsPayload:
    return get_results_payload(db)


@router.get("/results.csv")
def results_csv(db: Session = Depends(get_db)) -> PlainTextResponse:
    payload = get_results_payload(db)
    lines = [
        "section,key,label,baseline,ai_ethics,buddhist_ethics,delta,count,average_risk",
    ]

    for item in payload.domain_comparison:
        lines.append(
            ",".join(
                [
                    "domain",
                    item.domain,
                    item.domain_label,
                    _csv(item.baseline_average_risk),
                    _csv(item.ai_ethics_guided_average_risk),
                    _csv(
                        item.buddhist_ethics_guided_average_risk
                        or item.buddhist_guided_average_risk
                    ),
                    _csv(item.delta_risk),
                    str(item.count),
                    _csv(item.average_risk_score),
                ]
            )
        )

    for item in payload.condition_comparison:
        lines.append(
            ",".join(
                [
                    "condition",
                    item.condition,
                    item.condition_label,
                    "",
                    "",
                    "",
                    "",
                    str(item.count),
                    _csv(item.average_risk_score),
                ]
            )
        )

    for item in payload.rubric_comparison:
        lines.append(
            ",".join(
                [
                    "rubric",
                    item.key,
                    item.label.replace(",", " "),
                    _csv(item.baseline_average),
                    _csv(item.ai_ethics_guided_average),
                    _csv(
                        item.buddhist_ethics_guided_average or item.buddhist_guided_average
                    ),
                    _csv(item.delta),
                    "",
                    "",
                ]
            )
        )

    return PlainTextResponse(
        "\n".join(lines) + "\n",
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=ethics_results.csv"},
    )


def _csv(value: float | None) -> str:
    return "" if value is None else str(value)
