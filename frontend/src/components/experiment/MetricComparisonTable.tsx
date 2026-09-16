import type { ConditionExperimentResult, RubricKey } from '@/types/comparison'
import { CONDITION_META, CONDITIONS } from '@/utils/condition'
import { RUBRIC_ITEMS, maxKeys } from '@/utils/metrics'
import { scoreColorClass } from '@/utils/risk'

export function MetricComparisonTable({ results }: { results: ConditionExperimentResult[] }) {
  const byCondition = Object.fromEntries(results.map((r) => [r.condition, r])) as Record<
    string,
    ConditionExperimentResult
  >

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2">항목</th>
            {CONDITIONS.map((c) => (
              <th key={c} className="px-3 py-2">
                {CONDITION_META[c].shortLabel}
              </th>
            ))}
            <th className="px-3 py-2">가장 높은 조건</th>
          </tr>
        </thead>
        <tbody>
          {RUBRIC_ITEMS.map((item) => {
            const values = CONDITIONS.map((c) => ({
              key: c,
              value: byCondition[c]?.evaluation?.[item.key as RubricKey] ?? null,
            }))
            const winners = maxKeys(values)
            return (
              <tr key={item.key} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{item.label}</td>
                {CONDITIONS.map((c) => {
                  const v = byCondition[c]?.evaluation?.[item.key as RubricKey]
                  const highlight = winners.includes(c)
                  return (
                    <td key={c} className="px-3 py-2">
                      {v == null ? (
                        '-'
                      ) : (
                        <span
                          className={`rounded border px-1.5 py-0.5 text-xs font-medium ${
                            highlight ? scoreColorClass(v) : 'border-transparent'
                          }`}
                        >
                          {v}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-xs">
                  {winners.length
                    ? winners.map((c) => CONDITION_META[c as keyof typeof CONDITION_META].shortLabel).join(', ')
                    : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
