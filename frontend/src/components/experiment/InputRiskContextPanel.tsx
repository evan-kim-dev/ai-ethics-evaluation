import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { QuestionRiskContext } from '@/types/comparison'
import { DOMAIN_LABELS } from '@/utils/constants'

export function InputRiskContextPanel({ input }: { input: QuestionRiskContext }) {
  const items: Array<[string, number]> = [
    ['I1 분야 민감도', input.I1_domain_risk],
    ['I2 직접 위해 가능성', input.I2_harm_potential],
    ['I3 취약성·긴급성', input.I3_vulnerability_urgency],
    ['I4 AI 의존·결정 위임', input.I4_ai_dependence_risk],
  ]

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">상황·보호 맥락</h2>
          <p className="text-xs text-muted-foreground">
            도메인 기준 추정 · 사용자를 평가하지 않습니다.
          </p>
        </div>
        <Badge className="border-slate-300 bg-white">
          {DOMAIN_LABELS[input.domain] ?? input.domain}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border px-3 py-2 text-sm">
            <p className="text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}/3</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
