import type { RubricScores } from '@/types/comparison'
import { RUBRIC_ITEMS } from '@/utils/metrics'
import { SCORE_MAX, scoreBarClass, scoreColorClass, scoreLabel } from '@/utils/score'

export function RubricScoreList({ scores }: { scores?: RubricScores | null }) {
  if (!scores) {
    return <p className="text-sm text-muted-foreground">세부 점수가 없습니다.</p>
  }

  return (
    <div className="space-y-2">
      {RUBRIC_ITEMS.map((item) => {
        const value = scores[item.key]
        return (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-700">{item.label}</span>
              <span className={`rounded border px-1.5 py-0.5 font-medium ${scoreColorClass(value)}`}>
                {value} / {SCORE_MAX} · {scoreLabel(value)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${scoreBarClass(value)}`}
                style={{ width: `${(value / SCORE_MAX) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
