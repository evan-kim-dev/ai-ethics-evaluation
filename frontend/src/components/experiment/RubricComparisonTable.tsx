import type { ConditionExperimentResult, RubricKey } from '@/types/comparison'
import { CONDITION_META, CONDITIONS } from '@/utils/condition'
import { RUBRIC_ITEMS, maxKeys } from '@/utils/metrics'
import { SCORE_MAX, scoreBarClass, scoreColorClass, scoreLabel } from '@/utils/score'
import { cn } from '@/lib/utils'

export function RubricComparisonTable({ results }: { results: ConditionExperimentResult[] }) {
  const by = Object.fromEntries(results.map((r) => [r.condition, r])) as Record<
    string,
    ConditionExperimentResult
  >

  const ai = by.ai_ethics_guided?.evaluation
  const bud = by.ai_ethics_buddhist_guided?.evaluation
  const differingKeys = RUBRIC_ITEMS.filter((item) => {
    if (item.key === 'O7') {
      const a = ai?.O7
      const b = bud?.O7
      return a != null && b != null && a !== b
    }
    const key = item.key as Exclude<RubricKey, 'O7'>
    const a = ai?.[key]
    const b = bud?.[key]
    return a != null && b != null && a !== b
  })

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        {differingKeys.length > 0 ? (
          <p>
            <span className="font-semibold">AI 윤리 vs 윤리+불교 차이 항목:</span>{' '}
            {differingKeys.map((item) => item.label).join(', ')}
          </p>
        ) : (
          <p>
            AI 윤리와 윤리+불교의 E/C/N/O7 항목 점수가 동일합니다. 아래 표와 불교 B축을 함께
            확인하세요.
          </p>
        )}
        <p className="mt-1 text-xs text-amber-800/90">
          노란 칸 = AI 윤리와 다른 점수 · 초록 칸 = 해당 행에서 최고점
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2">평가 기준</th>
              <th className="px-3 py-2">무엇을 보나</th>
              {CONDITIONS.map((c) => (
                <th key={c} className="px-3 py-2">
                  {CONDITION_META[c].shortLabel}
                </th>
              ))}
              <th className="px-3 py-2">AI→불교 Δ</th>
              <th className="px-3 py-2">최고</th>
            </tr>
          </thead>
          <tbody>
            {RUBRIC_ITEMS.map((item) => {
              const values = CONDITIONS.map((c) => ({
                key: c,
                value:
                  item.key === 'O7'
                    ? (by[c]?.evaluation?.O7 ?? null)
                    : (by[c]?.evaluation?.[item.key as Exclude<RubricKey, 'O7'>] ?? null),
              }))
              const winners = maxKeys(values)
              const aiVal = values.find((v) => v.key === 'ai_ethics_guided')?.value ?? null
              const budVal = values.find((v) => v.key === 'ai_ethics_buddhist_guided')?.value ?? null
              const delta =
                aiVal != null && budVal != null ? budVal - aiVal : null

              return (
                <tr key={item.key} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-medium">{item.label}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{item.description}</td>
                  {CONDITIONS.map((c) => {
                    const v =
                      item.key === 'O7'
                        ? by[c]?.evaluation?.O7
                        : by[c]?.evaluation?.[item.key as Exclude<RubricKey, 'O7'>]
                    const differsFromAi =
                      c === 'ai_ethics_buddhist_guided' &&
                      aiVal != null &&
                      v != null &&
                      v !== aiVal
                    const isWinner = winners.includes(c)
                    return (
                      <td key={c} className="px-3 py-2">
                        {v == null ? (
                          '-'
                        ) : (
                          <div className="space-y-1">
                            <span
                              className={cn(
                                'inline-block rounded border px-1.5 py-0.5 text-xs font-medium',
                                scoreColorClass(v),
                                differsFromAi && 'ring-2 ring-amber-400',
                                isWinner && 'ring-2 ring-emerald-400',
                              )}
                            >
                              {v}/5 · {scoreLabel(v)}
                            </span>
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full ${scoreBarClass(v)}`}
                                style={{ width: `${(v / SCORE_MAX) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td
                    className={cn(
                      'px-3 py-2 text-sm font-semibold',
                      delta == null
                        ? 'text-muted-foreground'
                        : delta > 0
                          ? 'text-emerald-700'
                          : delta < 0
                            ? 'text-red-700'
                            : 'text-slate-500',
                    )}
                  >
                    {delta == null ? '-' : delta > 0 ? `+${delta}` : `${delta}`}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {winners.length
                      ? winners
                          .map((c) => CONDITION_META[c as keyof typeof CONDITION_META].shortLabel)
                          .join(', ')
                      : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
