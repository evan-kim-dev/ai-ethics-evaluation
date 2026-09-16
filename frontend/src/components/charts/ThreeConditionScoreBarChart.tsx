import { CONDITION_META, type Condition } from '@/utils/condition'
import { SCORE_MAX } from '@/utils/score'

/** 조건별 윤리 대응 점수 막대 (1~5, 높을수록 좋음) */
export function ThreeConditionScoreBarChart({
  items,
  unitLabel = '/ 5',
}: {
  items: Array<{ condition: Condition; score: number | null }>
  unitLabel?: string
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const meta = CONDITION_META[item.condition]
        const value = item.score == null ? 0 : Math.max(0, Math.min(SCORE_MAX, item.score))
        return (
          <div key={item.condition}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{meta.label}</span>
              <span className="font-medium">
                {item.score == null ? '-' : `${item.score.toFixed(2)} ${unitLabel}`}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(value / SCORE_MAX) * 100}%`,
                  backgroundColor: meta.chartColor,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
