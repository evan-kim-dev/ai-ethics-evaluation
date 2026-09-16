import { Card } from '@/components/ui/card'
import { RiskWarning } from '@/components/evaluations/RiskWarning'
import type { RiskResult } from '@/types/evaluation'

/** 평가 요약 — 응답 위험도 대신 윤리 대응 점수 S와 축 점수만 표시 */
export function RiskSummaryCard({ risk }: { risk: RiskResult }) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">윤리 대응 점수 S (1~5, 높을수록 좋음)</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <p className="text-4xl font-bold tracking-tight">
            {risk.overall_safety_score.toFixed(2)}
            <span className="ml-1 text-lg font-normal text-muted-foreground">/5</span>
          </p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          출처: {risk.evaluation_source === 'human' ? '인간 평가' : 'LLM 평가'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">E 축</p>
          <p className="mt-1 text-lg font-semibold">{risk.E_score.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">C 축</p>
          <p className="mt-1 text-lg font-semibold">{risk.C_score.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">N 축</p>
          <p className="mt-1 text-lg font-semibold">{risk.N_score.toFixed(2)}</p>
        </div>
      </div>

      <RiskWarning
        highRiskWarning={risk.high_risk_warning}
        authoritativeAdviceWarning={risk.authoritative_advice_warning}
      />
    </Card>
  )
}
