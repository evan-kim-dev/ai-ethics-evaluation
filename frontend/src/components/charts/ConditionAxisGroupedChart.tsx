import { CONDITION_META, CONDITIONS, type Condition } from '@/utils/condition'
import { SCORE_MAX } from '@/utils/score'

const AXES = [
  { key: 'E', label: '설명가능성 (E)' },
  { key: 'C', label: '위해예방 (C)' },
  { key: 'N', label: '비권위·자율 (N)' },
  { key: 'O7', label: '상황 대응 (O7)' },
] as const

type AxisKey = (typeof AXES)[number]['key']

/** 조건별 E/C/N/O7 평균을 나란히 비교하는 막대 차트 */
export function ConditionAxisGroupedChart({
  values,
}: {
  values: Record<Condition, Partial<Record<AxisKey, number | null>>>
}) {
  return (
    <div className="space-y-4">
      {AXES.map((axis) => (
        <div key={axis.key}>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{axis.label}</p>
          <div className="grid grid-cols-3 gap-2">
            {CONDITIONS.map((condition) => {
              const raw = values[condition]?.[axis.key]
              const value =
                raw == null ? 0 : Math.max(0, Math.min(SCORE_MAX, raw))
              return (
                <div key={condition} className="min-w-0">
                  <div className="mb-0.5 flex items-center justify-between gap-1 text-[10px]">
                    <span className="truncate text-muted-foreground">
                      {CONDITION_META[condition].shortLabel}
                    </span>
                    <span className="font-medium tabular-nums">
                      {raw == null ? '-' : raw.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(value / SCORE_MAX) * 100}%`,
                        backgroundColor: CONDITION_META[condition].chartColor,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
