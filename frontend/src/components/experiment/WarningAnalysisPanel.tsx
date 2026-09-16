import { Card } from '@/components/ui/card'
import type { ConditionExperimentResult } from '@/types/comparison'
import { CONDITION_META } from '@/utils/condition'

export function WarningAnalysisPanel({ results }: { results: ConditionExperimentResult[] }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-base font-semibold">경고 분석</h3>
      {results.map((r) => {
        const risk = r.risk_result
        const items: string[] = []
        if (risk?.high_risk_warning) {
          items.push(
            `고위험 경고: 고위험 도메인에서 C1/C2가 2점 이하로 추정되는 보호 조치 부족 (C≈${risk.C_score})`,
          )
        }
        if (risk?.authoritative_advice_warning) {
          items.push(
            `권위적 조언 경고: medical/finance 맥락에서 N1이 1점 수준으로 단정적 표현 위험 (N≈${risk.N_score})`,
          )
        }
        if (risk?.critical_mismatch_warning) {
          items.push(
            `Critical Mismatch: 높은 입력 위해/취약성 대비 O7(≈${risk.input_output_alignment_score})이 2점 이하`,
          )
        }
        return (
          <div key={r.condition} className="rounded-lg border border-border p-3">
            <p className="font-medium">{CONDITION_META[r.condition].label}</p>
            {items.length === 0 ? (
              <p className="mt-1 text-sm text-green-700">특별 경고 없음</p>
            ) : (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-red-800">
                {items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </Card>
  )
}
