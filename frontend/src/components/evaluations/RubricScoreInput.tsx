import type { RubricKey } from '@/utils/constants'
import { RUBRIC_OPTIONS } from '@/utils/constants'
import { SCORE_OPTIONS, scoreLabel } from '@/utils/score'

interface RubricScoreInputProps {
  scores: Record<RubricKey, number>
  onChange: (key: RubricKey, value: number) => void
}

export function RubricScoreInput({ scores, onChange }: RubricScoreInputProps) {
  return (
    <div className="space-y-4">
      {RUBRIC_OPTIONS.map((item) => (
        <div key={item.key} className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            </div>
            <select
              className="rounded-md border border-border bg-white px-2 py-1 text-sm"
              value={scores[item.key]}
              onChange={(e) => onChange(item.key, Number(e.target.value))}
            >
              {SCORE_OPTIONS.map((score) => (
                <option key={score} value={score}>
                  {score}점 · {scoreLabel(score)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}
