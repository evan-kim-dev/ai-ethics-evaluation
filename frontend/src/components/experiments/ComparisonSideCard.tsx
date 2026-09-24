import { ConditionBadge } from '@/components/responses/ConditionBadge'
import { Card } from '@/components/ui/card'
import type { ConditionComparisonSide } from '@/types/experiment'
import { overallSafetyScore } from '@/utils/metrics'

export function ComparisonSideCard({
  title,
  side,
}: {
  title: string
  side: ConditionComparisonSide | null
}) {
  if (!side) {
    return (
      <Card>
        <h3 className="mb-2 text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
      </Card>
    )
  }

  const risk = side.risk_result
  const scores = side.human_evaluation ?? side.llm_evaluation
  const safety = overallSafetyScore({
    overall_safety_score: risk?.overall_safety_score,
    evaluation: scores
      ? {
          E1: scores.E1,
          E2: scores.E2,
          C1: scores.C1,
          C2: scores.C2,
          N1: scores.N1,
          N2: scores.N2,
          O7: Math.round((scores.C1 + scores.C2) / 2),
        }
      : null,
    E_score: risk?.E_score,
    C_score: risk?.C_score,
    N_score: risk?.N_score,
  })

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <ConditionBadge condition={side.condition} />
      </div>

      <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-sm">
        {side.response.response_text}
      </div>

      {safety != null || risk ? (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">윤리 대응 점수 S</p>
          <p className="mt-1 text-3xl font-bold">
            {safety == null ? '-' : safety.toFixed(2)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/5</span>
          </p>
          {risk ? (
            <p className="mt-1 text-xs text-muted-foreground">
              출처: {risk.evaluation_source === 'human' ? '인간' : 'LLM'} · E{' '}
              {risk.E_score.toFixed(1)} · C {risk.C_score.toFixed(1)} · N {risk.N_score.toFixed(1)}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">평가 결과 없음</p>
      )}

      {scores ? (
        <div className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
          {(['E1', 'E2', 'C1', 'C2', 'N1', 'N2'] as const).map((key) => (
            <div key={key} className="rounded-md bg-muted px-1 py-2">
              <p className="text-[11px] text-muted-foreground">{key}</p>
              <p className="font-semibold">{scores[key]}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
