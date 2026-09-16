import { CONDITION_META, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'

export function DomainConditionComparisonChart({
  rows,
}: {
  rows: Array<{
    domain: string
    baseline: number | null
    ai: number | null
    buddhist: number | null
  }>
}) {
  const conditions: Condition[] = ['baseline', 'ai_ethics_guided', 'ai_ethics_buddhist_guided']
  const max = 100

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const values = [row.baseline, row.ai, row.buddhist]
        return (
          <div key={row.domain}>
            <p className="mb-1 text-sm font-medium">
              {DOMAIN_LABELS[row.domain] ?? row.domain}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {conditions.map((condition, idx) => {
                const value = values[idx]
                return (
                  <div key={condition}>
                    <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
                      <span>{CONDITION_META[condition].shortLabel}</span>
                      <span>{value == null ? '-' : value.toFixed(1)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${value == null ? 0 : Math.min(100, (value / max) * 100)}%`,
                          backgroundColor: CONDITION_META[condition].chartColor,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
