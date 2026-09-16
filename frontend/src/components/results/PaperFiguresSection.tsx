import { Card } from '@/components/ui/card'
import { DomainConditionHeatmap, type HeatmapRow } from '@/components/charts/DomainConditionHeatmap'
import {
  ConditionWinShareChart,
  DomainDeltaBars,
} from '@/components/charts/PaperResultCharts'
import { ThreeConditionScoreBarChart } from '@/components/charts/ThreeConditionScoreBarChart'
import { CONDITION_META, CONDITIONS, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'
import { cn } from '@/lib/utils'

export type PaperConditionStat = {
  condition: Condition
  mean: number | null
  sd: number | null
  n: number
  deltaVsBaseline: number | null
}

function FigureCaption({ id, text }: { id: string; text: string }) {
  return (
    <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
      <span className="font-bold text-foreground">{id}.</span> {text}
    </p>
  )
}

export function PaperFiguresSection({
  conditionStats,
  wins,
  heatmapRows,
  domainDeltas,
}: {
  conditionStats: PaperConditionStat[]
  wins: Record<Condition, number>
  heatmapRows: HeatmapRow[]
  domainDeltas: Array<{
    domain: string
    label: string
    deltaAi: number | null
    deltaBuddhist: number | null
  }>
}) {
  const totalWins = CONDITIONS.reduce((sum, c) => sum + (wins[c] ?? 0), 0)
  const scoreItems = CONDITIONS.map((condition) => ({
    condition,
    score: conditionStats.find((s) => s.condition === condition)?.mean ?? null,
  }))

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold tracking-[0.14em] text-accent uppercase">Paper figures</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight">논문용 결과 그래프</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          아래 그림·표는 논문 Results 절에 바로 옮길 수 있도록 정리했습니다. 캡션을 참고해
          Figure로 사용하세요.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="hover:translate-y-0">
          <h3 className="text-base font-bold tracking-tight">조건별 평균 윤리대응점수 S</h3>
          <ThreeConditionScoreBarChart items={scoreItems} />
          <FigureCaption
            id="Fig. 1"
            text="세 조건의 평균 윤리대응점수(S, 1–5점). 높을수록 윤리적으로 더 적절한 응답으로 해석한다."
          />
        </Card>

        <Card className="hover:translate-y-0">
          <h3 className="text-base font-bold tracking-tight">질문별 최고 S 조건 비율</h3>
          <ConditionWinShareChart wins={wins} total={totalWins} />
          <FigureCaption
            id="Fig. 2"
            text="문항마다 S가 가장 높았던 조건의 비율. 동점이 있으면 구현상 우선순위에 따라 한 조건으로 집계될 수 있다."
          />
        </Card>

        <Card className="hover:translate-y-0 lg:col-span-2">
          <h3 className="mb-2 text-base font-bold tracking-tight">도메인 × 조건 평균 S 히트맵</h3>
          <DomainConditionHeatmap rows={heatmapRows} />
          <FigureCaption
            id="Fig. 3"
            text="도메인별 세 조건의 평균 S. 색이 진할수록 점수가 높다."
          />
        </Card>

        <Card className="hover:translate-y-0">
          <h3 className="mb-3 text-base font-bold tracking-tight">도메인별 Baseline 대비 ΔS</h3>
          <DomainDeltaBars rows={domainDeltas} />
          <FigureCaption
            id="Fig. 4"
            text="도메인별 ΔS = 처치조건 − Baseline. 양수는 Baseline 대비 향상."
          />
        </Card>

        <Card className="hover:translate-y-0">
          <h3 className="mb-3 text-base font-bold tracking-tight">Table 1. 조건별 기술통계</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-semibold">조건</th>
                  <th className="py-2 pr-2 font-semibold">n</th>
                  <th className="py-2 pr-2 font-semibold">Mean S</th>
                  <th className="py-2 pr-2 font-semibold">SD</th>
                  <th className="py-2 font-semibold">ΔS vs Baseline</th>
                </tr>
              </thead>
              <tbody>
                {conditionStats.map((row) => (
                  <tr key={row.condition} className="border-b border-border/70">
                    <td className="py-2.5 pr-2 font-semibold">
                      <span style={{ color: CONDITION_META[row.condition].chartColor }}>
                        {CONDITION_META[row.condition].label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 tabular-nums">{row.n}</td>
                    <td className="py-2.5 pr-2 font-bold tabular-nums">
                      {row.mean == null ? '—' : row.mean.toFixed(2)}
                    </td>
                    <td className="py-2.5 pr-2 tabular-nums text-muted-foreground">
                      {row.sd == null ? '—' : row.sd.toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 font-semibold tabular-nums',
                        row.deltaVsBaseline == null
                          ? 'text-muted-foreground'
                          : row.deltaVsBaseline > 0
                            ? 'text-emerald-600'
                            : row.deltaVsBaseline < 0
                              ? 'text-red-500'
                              : 'text-muted-foreground',
                      )}
                    >
                      {row.condition === 'baseline'
                        ? '—'
                        : row.deltaVsBaseline == null
                          ? '—'
                          : `${row.deltaVsBaseline > 0 ? '+' : ''}${row.deltaVsBaseline.toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FigureCaption
            id="Table 1"
            text="조건별 평균 윤리대응점수(S)와 표준편차, Baseline 대비 변화량(ΔS). n은 해당 조건 점수가 있는 문항 수."
          />
        </Card>
      </div>

      <Card className="hover:translate-y-0">
        <h3 className="mb-2 text-base font-bold tracking-tight">도메인별 요약 (복붙용)</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-2 font-semibold">도메인</th>
                <th className="py-2 pr-2 font-semibold">Baseline</th>
                <th className="py-2 pr-2 font-semibold">AI 윤리</th>
                <th className="py-2 pr-2 font-semibold">윤리+불교</th>
                <th className="py-2 pr-2 font-semibold">Δ AI</th>
                <th className="py-2 font-semibold">Δ 불교</th>
              </tr>
            </thead>
            <tbody>
              {heatmapRows.map((row) => {
                const delta = domainDeltas.find((d) => d.domain === row.domain)
                return (
                  <tr key={row.domain} className="border-b border-border/70">
                    <td className="py-2 pr-2 font-semibold">
                      {DOMAIN_LABELS[row.domain] ?? row.domain}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {row.baseline == null ? '—' : row.baseline.toFixed(2)}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {row.ai == null ? '—' : row.ai.toFixed(2)}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {row.buddhist == null ? '—' : row.buddhist.toFixed(2)}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-muted-foreground">
                      {delta?.deltaAi == null
                        ? '—'
                        : `${delta.deltaAi > 0 ? '+' : ''}${delta.deltaAi.toFixed(2)}`}
                    </td>
                    <td className="py-2 tabular-nums text-muted-foreground">
                      {delta?.deltaBuddhist == null
                        ? '—'
                        : `${delta.deltaBuddhist > 0 ? '+' : ''}${delta.deltaBuddhist.toFixed(2)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <FigureCaption
          id="Table 2"
          text="도메인별 조건 평균 S와 Baseline 대비 ΔS."
        />
      </Card>
    </section>
  )
}
