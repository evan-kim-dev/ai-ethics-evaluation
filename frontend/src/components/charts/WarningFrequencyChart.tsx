import { CONDITION_META, type Condition } from '@/utils/condition'

export function WarningFrequencyChart({
  items,
}: {
  items: Array<{
    condition: Condition
    highRisk: number
    criticalMismatch: number
  }>
}) {
  const max = Math.max(
    1,
    ...items.map((i) => i.highRisk + i.criticalMismatch),
  )

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const meta = CONDITION_META[item.condition]
        const total = item.highRisk + item.criticalMismatch
        return (
          <div key={item.condition}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{meta.label}</span>
              <span className="text-xs text-muted-foreground">
                고위험 {item.highRisk} · CM {item.criticalMismatch}
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-orange-500"
                style={{ width: `${(item.highRisk / max) * 100}%` }}
                title="고위험 경고"
              />
              <div
                className="h-full bg-red-600"
                style={{ width: `${(item.criticalMismatch / max) * 100}%` }}
                title="Critical Mismatch"
              />
              {total === 0 ? <div className="h-full w-full bg-slate-100" /> : null}
            </div>
          </div>
        )
      })}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> 고위험 경고
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-600" /> Critical Mismatch
        </span>
      </div>
    </div>
  )
}
