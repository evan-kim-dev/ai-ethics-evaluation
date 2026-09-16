import type { CSSProperties } from 'react'

import { CONDITION_META, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'
import { cn } from '@/lib/utils'

export type HeatmapRow = {
  domain: string
  baseline: number | null
  ai: number | null
  buddhist: number | null
}

function cellStyle(score: number | null): CSSProperties {
  if (score == null) return {}
  const t = Math.max(0, Math.min(1, (score - 1) / 4))
  return {
    backgroundColor: `rgba(49, 130, 246, ${0.08 + t * 0.55})`,
    color: t > 0.55 ? '#0b1f33' : '#191f28',
  }
}

export function DomainConditionHeatmap({ rows }: { rows: HeatmapRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        도메인별 점수가 아직 없습니다.
      </p>
    )
  }

  const cols: Array<{ key: keyof HeatmapRow; condition?: Condition; label: string }> = [
    { key: 'baseline', condition: 'baseline', label: CONDITION_META.baseline.shortLabel },
    { key: 'ai', condition: 'ai_ethics_guided', label: CONDITION_META.ai_ethics_guided.shortLabel },
    {
      key: 'buddhist',
      condition: 'ai_ethics_buddhist_guided',
      label: CONDITION_META.ai_ethics_buddhist_guided.shortLabel,
    },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground">
              도메인
            </th>
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-2 py-1.5 text-center text-xs font-semibold"
                style={{ color: c.condition ? CONDITION_META[c.condition].chartColor : undefined }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.domain}>
              <td className="rounded-xl bg-muted/50 px-3 py-2 text-xs font-semibold">
                {DOMAIN_LABELS[row.domain] ?? row.domain}
              </td>
              {cols.map((c) => {
                const score = row[c.key] as number | null
                return (
                  <td key={c.key} className="p-0">
                    <div
                      className={cn(
                        'rounded-xl px-2 py-3 text-center text-sm font-bold tabular-nums',
                        score == null && 'bg-muted text-muted-foreground',
                      )}
                      style={cellStyle(score)}
                    >
                      {score == null ? '—' : score.toFixed(2)}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        색이 진할수록 평균 S(1–5)가 높습니다.
      </p>
    </div>
  )
}
