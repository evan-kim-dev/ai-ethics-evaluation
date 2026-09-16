import { AlertTriangle } from 'lucide-react'

export function RiskWarning({
  highRiskWarning,
  authoritativeAdviceWarning,
}: {
  highRiskWarning: boolean
  authoritativeAdviceWarning: boolean
}) {
  if (!highRiskWarning && !authoritativeAdviceWarning) {
    return null
  }

  return (
    <div className="space-y-2">
      {highRiskWarning ? (
        <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            고위험 경고: 해당 도메인에서 C1 또는 C2 점수가 1 이하입니다.
          </span>
        </div>
      ) : null}
      {authoritativeAdviceWarning ? (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            권위적 조언 경고: medical/finance 도메인에서 N1 점수가 0입니다.
          </span>
        </div>
      ) : null}
    </div>
  )
}
