import { CONDITION_META, CONDITIONS, type Condition } from '@/utils/condition'
import { cn } from '@/lib/utils'

export function ConditionWinShareChart({
  wins,
  total,
}: {
  wins: Record<Condition, number>
  total: number
}) {
  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        승률을 계산할 분석 결과가 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-muted">
        {CONDITIONS.map((condition) => {
          const count = wins[condition] ?? 0
          const pct = (count / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={condition}
              className="h-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: CONDITION_META[condition].chartColor,
              }}
              title={`${CONDITION_META[condition].label}: ${count}건 (${pct.toFixed(1)}%)`}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {CONDITIONS.map((condition) => {
          const count = wins[condition] ?? 0
          const pct = (count / total) * 100
          return (
            <div
              key={condition}
              className="rounded-2xl bg-muted/60 px-3 py-3 text-center"
            >
              <p
                className="text-xs font-semibold"
                style={{ color: CONDITION_META[condition].chartColor }}
              >
                {CONDITION_META[condition].shortLabel}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                {pct.toFixed(0)}
                <span className="text-sm font-semibold text-muted-foreground">%</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{count}문항</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DomainDeltaBars({
  rows,
}: {
  rows: Array<{
    domain: string
    label: string
    deltaAi: number | null
    deltaBuddhist: number | null
  }>
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">도메인 ΔS 데이터가 없습니다.</p>
    )
  }

  const maxAbs = Math.max(
    0.5,
    ...rows.flatMap((r) => [Math.abs(r.deltaAi ?? 0), Math.abs(r.deltaBuddhist ?? 0)]),
  )

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.domain} className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">{row.label}</p>
          {(
            [
              {
                key: 'ai',
                value: row.deltaAi,
                color: CONDITION_META.ai_ethics_guided.chartColor,
                label: 'AI 윤리',
              },
              {
                key: 'bud',
                value: row.deltaBuddhist,
                color: CONDITION_META.ai_ethics_buddhist_guided.chartColor,
                label: '윤리+불교',
              },
            ] as const
          ).map((item) => {
            const v = item.value
            const width = v == null ? 0 : (Math.abs(v) / maxAbs) * 50
            return (
              <div key={item.key} className="flex items-center gap-2 text-xs">
                <span className="w-16 shrink-0 text-muted-foreground">{item.label}</span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  {v != null ? (
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{
                        width: `${width}%`,
                        left: v >= 0 ? '50%' : `calc(50% - ${width}%)`,
                        backgroundColor: item.color,
                      }}
                    />
                  ) : null}
                </div>
                <span
                  className={cn(
                    'w-12 shrink-0 text-right font-semibold tabular-nums',
                    v == null
                      ? 'text-muted-foreground'
                      : v > 0
                        ? 'text-emerald-600'
                        : v < 0
                          ? 'text-red-500'
                          : 'text-muted-foreground',
                  )}
                >
                  {v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
