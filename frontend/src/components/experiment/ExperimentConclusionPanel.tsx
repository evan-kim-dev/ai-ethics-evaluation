import { Card } from '@/components/ui/card'
import type { ConditionExperimentResult } from '@/types/comparison'
import { CONDITION_META, type Condition } from '@/utils/condition'
import { axisAverages, overallSafetyScore, safetyDelta } from '@/utils/metrics'
import { formatDelta, interpretDelta } from '@/utils/risk'

export function ExperimentConclusionPanel({
  results,
  bestCondition,
}: {
  results: ConditionExperimentResult[]
  bestCondition?: Condition | null
}) {
  const by = Object.fromEntries(results.map((r) => [r.condition, r])) as Record<
    string,
    ConditionExperimentResult
  >

  const baselineS = safetyOf(by.baseline)
  const aiS = safetyOf(by.ai_ethics_guided)
  const budS = safetyOf(by.ai_ethics_buddhist_guided)
  const deltaAi = safetyDelta(baselineS, aiS)
  const deltaBud = safetyDelta(baselineS, budS)

  const resolvedBest =
    bestCondition ??
    ([
      { key: 'baseline' as Condition, value: baselineS },
      { key: 'ai_ethics_guided' as Condition, value: aiS },
      { key: 'ai_ethics_buddhist_guided' as Condition, value: budS },
    ]
      .filter((x): x is { key: Condition; value: number } => x.value != null)
      .sort((a, b) => b.value - a.value)[0]?.key ?? null)

  const cells: Array<{ label: string; value: string; sub?: string; className?: string }> = [
    {
      label: 'Baseline 윤리 대응 S',
      value: fmtS(baselineS),
      sub: axisSub(by.baseline),
    },
    {
      label: 'AI 윤리 대응 S',
      value: fmtS(aiS),
      sub: axisSub(by.ai_ethics_guided),
    },
    {
      label: 'AI 윤리+불교 대응 S',
      value: fmtS(budS),
      sub: axisSub(by.ai_ethics_buddhist_guided),
    },
    {
      label: '종합 점수 최고 조건',
      value: resolvedBest ? CONDITION_META[resolvedBest].label : '-',
    },
    {
      label: 'ΔS (AI 윤리)',
      value: formatDelta(deltaAi),
      sub: interpretDelta(deltaAi).label,
      className: interpretDelta(deltaAi).className,
    },
    {
      label: 'ΔS (AI 윤리+불교)',
      value: formatDelta(deltaBud),
      sub: interpretDelta(deltaBud).label,
      className: interpretDelta(deltaBud).className,
    },
  ]

  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold">결론 먼저 보기</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        윤리 대응 점수 S(1~5, 높을수록 좋음)와 E/C/N 축으로 비교합니다. B1–B3는 별도 부가 지표입니다.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-lg border border-border px-3 py-3">
            <p className="text-xs text-muted-foreground">{cell.label}</p>
            <p className={`mt-1 text-xl font-bold ${cell.className ?? ''}`}>{cell.value}</p>
            {cell.sub ? <p className="mt-0.5 text-xs text-muted-foreground">{cell.sub}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  )
}

function safetyOf(result?: ConditionExperimentResult) {
  if (!result) return null
  return overallSafetyScore({
    overall_safety_score: result.risk_result?.overall_safety_score,
    evaluation: result.evaluation,
    E_score: result.risk_result?.E_score,
    C_score: result.risk_result?.C_score,
    N_score: result.risk_result?.N_score,
  })
}

function fmtS(score: number | null) {
  return score == null ? '-' : `${score.toFixed(2)} / 5`
}

function axisSub(result?: ConditionExperimentResult) {
  const axes = axisAverages(result?.evaluation)
  if (axes.E == null && axes.C == null && axes.N == null) {
    const r = result?.risk_result
    if (!r) return undefined
    return `E ${r.E_score.toFixed(1)} · C ${r.C_score.toFixed(1)} · N ${r.N_score.toFixed(1)}`
  }
  return `E ${fmtAxis(axes.E)} · C ${fmtAxis(axes.C)} · N ${fmtAxis(axes.N)}`
}

function fmtAxis(v: number | null) {
  return v == null ? '-' : v.toFixed(1)
}
