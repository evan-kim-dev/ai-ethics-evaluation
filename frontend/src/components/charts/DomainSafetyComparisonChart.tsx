import { CONDITION_META, CONDITIONS, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'
import { SCORE_MAX } from '@/utils/score'

type DomainRow = {
  domain: string
  baseline: number | null
  ai: number | null
  buddhist: number | null
}

/** 도메인별 3조건 평균 S 비교 (1~5) */
export function DomainSafetyComparisonChart({ rows }: { rows: DomainRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        도메인별 분석 결과가 아직 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const values: Array<number | null> = [row.baseline, row.ai, row.buddhist]
        return (
          <div key={row.domain}>
            <p className="mb-1.5 text-sm font-medium">
              {DOMAIN_LABELS[row.domain] ?? row.domain}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((condition, idx) => {
                const raw = values[idx]
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
                        className="h-full rounded-full"
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
        )
      })}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {CONDITIONS.map((c) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: CONDITION_META[c].chartColor }}
            />
            {CONDITION_META[c].shortLabel}
          </span>
        ))}
      </div>
    </div>
  )
}

/** 질문별 3조건 S를 점으로 나란히 보여 분포를 파악 */
export function QuestionSafetyStripChart({
  rows,
}: {
  rows: Array<{
    questionId: number
    label: string
    baseline: number | null
    ai: number | null
    buddhist: number | null
  }>
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        질문별 점수가 아직 없습니다.
      </p>
    )
  }

  const shown = rows.slice(0, 12)

  return (
    <div className="space-y-3">
      {shown.map((row) => (
        <div key={row.questionId}>
          <p className="mb-1 truncate text-xs text-slate-700" title={row.label}>
            #{row.questionId} {row.label}
          </p>
          <div className="relative h-6 rounded-md bg-slate-100">
            {/* scale ticks */}
            {[1, 2, 3, 4, 5].map((tick) => (
              <div
                key={tick}
                className="absolute top-0 h-full w-px bg-slate-200"
                style={{ left: `${((tick - 1) / 4) * 100}%` }}
              />
            ))}
            {(
              [
                ['baseline', row.baseline],
                ['ai_ethics_guided', row.ai],
                ['ai_ethics_buddhist_guided', row.buddhist],
              ] as Array<[Condition, number | null]>
            ).map(([condition, score]) => {
              if (score == null) return null
              const clamped = Math.max(1, Math.min(SCORE_MAX, score))
              const left = ((clamped - 1) / 4) * 100
              return (
                <span
                  key={condition}
                  title={`${CONDITION_META[condition].shortLabel}: ${score.toFixed(2)}`}
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                  style={{
                    left: `${left}%`,
                    backgroundColor: CONDITION_META[condition].chartColor,
                  }}
                />
              )
            })}
          </div>
        </div>
      ))}
      {rows.length > 12 ? (
        <p className="text-xs text-muted-foreground">
          외 {rows.length - 12}개 질문은 목록에서 확인하세요.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>왼쪽 1 · 오른쪽 5</span>
        {CONDITIONS.map((c) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CONDITION_META[c].chartColor }}
            />
            {CONDITION_META[c].shortLabel}
          </span>
        ))}
      </div>
    </div>
  )
}
