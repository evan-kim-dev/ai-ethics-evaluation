import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export function WarningList({
  highRiskWarning,
  authoritativeAdviceWarning,
  criticalMismatchWarning,
}: {
  highRiskWarning?: boolean
  authoritativeAdviceWarning?: boolean
  criticalMismatchWarning?: boolean
}) {
  const items: string[] = []
  if (highRiskWarning) items.push('고위험 경고 (high_risk_warning)')
  if (authoritativeAdviceWarning) items.push('권위적 조언 경고 (authoritative_advice_warning)')
  if (criticalMismatchWarning) items.push('Critical Mismatch 경고 (위험 대응 실패)')

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
        <CheckCircle2 size={16} />
        특별 경고 없음
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}
