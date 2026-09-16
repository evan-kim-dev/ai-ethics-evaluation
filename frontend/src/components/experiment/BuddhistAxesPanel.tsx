import { Card } from '@/components/ui/card'
import type { ConditionExperimentResult } from '@/types/comparison'
import { CONDITION_META, CONDITIONS } from '@/utils/condition'
import { BUDDHIST_AXIS_ITEMS, average } from '@/utils/metrics'
import { SCORE_MAX, scoreBarClass, scoreColorClass, scoreLabel } from '@/utils/score'
import { cn } from '@/lib/utils'

export function BuddhistAxesPanel({ results }: { results: ConditionExperimentResult[] }) {
  const by = Object.fromEntries(results.map((r) => [r.condition, r]))

  const averages = CONDITIONS.map((c) => {
    const ev = by[c]?.evaluation
    return {
      condition: c,
      value: average([ev?.B1, ev?.B2, ev?.B3]),
    }
  })

  const aiAvg = averages.find((a) => a.condition === 'ai_ethics_guided')?.value ?? null
  const budAvg = averages.find((a) => a.condition === 'ai_ethics_buddhist_guided')?.value ?? null
  const delta =
    aiAvg != null && budAvg != null ? Math.round((budAvg - aiAvg) * 100) / 100 : null

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">불교 행동 축 B1–B3 (S 미합산)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          연기·자비·무아를 <span className="font-medium">응답 행동</span>으로만 채점합니다. 교리
          용어 나열은 가점이 아닙니다. 종합 점수 S에는 넣지 않습니다.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {averages.map((row) => (
          <div key={row.condition} className="rounded-lg bg-muted px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">{CONDITION_META[row.condition].shortLabel}</p>
            <p className="text-lg font-semibold">
              {row.value == null ? '-' : row.value.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">/5</span>
            </p>
          </div>
        ))}
      </div>
      <p
        className={cn(
          'text-sm',
          delta == null
            ? 'text-muted-foreground'
            : delta > 0
              ? 'text-emerald-700'
              : delta < 0
                ? 'text-red-700'
                : 'text-slate-600',
        )}
      >
        AI 윤리 대비 불교 축 평균 Δ:{' '}
        {delta == null ? '-' : delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
        {delta != null && delta > 0
          ? ' · 윤리+불교가 행동 축에서 더 높음'
          : delta != null && delta < 0
            ? ' · 윤리+불교가 행동 축에서 더 낮음'
            : ''}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2">축</th>
              <th className="px-3 py-2">행동 기준</th>
              {CONDITIONS.map((c) => (
                <th key={c} className="px-3 py-2">
                  {CONDITION_META[c].shortLabel}
                </th>
              ))}
              <th className="px-3 py-2">AI→불교 Δ</th>
            </tr>
          </thead>
          <tbody>
            {BUDDHIST_AXIS_ITEMS.map((item) => {
              const aiVal = by.ai_ethics_guided?.evaluation?.[item.key] ?? null
              const budVal = by.ai_ethics_buddhist_guided?.evaluation?.[item.key] ?? null
              const d = aiVal != null && budVal != null ? budVal - aiVal : null
              return (
                <tr key={item.key} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-medium">{item.label}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{item.description}</td>
                  {CONDITIONS.map((c) => {
                    const v = by[c]?.evaluation?.[item.key] ?? null
                    const highlight =
                      c === 'ai_ethics_buddhist_guided' && d != null && d !== 0
                    return (
                      <td key={c} className="px-3 py-2">
                        {v == null ? (
                          <span className="text-xs text-muted-foreground">미채점</span>
                        ) : (
                          <div className="space-y-1">
                            <span
                              className={cn(
                                'inline-block rounded border px-1.5 py-0.5 text-xs font-medium',
                                scoreColorClass(v),
                                highlight && 'ring-2 ring-violet-400',
                              )}
                            >
                              {v}/5 · {scoreLabel(v)}
                            </span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
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
                      'px-3 py-2 font-semibold',
                      d == null
                        ? 'text-muted-foreground'
                        : d > 0
                          ? 'text-emerald-700'
                          : d < 0
                            ? 'text-red-700'
                            : 'text-slate-500',
                    )}
                  >
                    {d == null ? '-' : d > 0 ? `+${d}` : `${d}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
