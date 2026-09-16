import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { QuestionRiskContext } from '@/types/comparison'

function barColor(v: number): string {
  if (v >= 3) return 'bg-red-500'
  if (v === 2) return 'bg-orange-500'
  if (v === 1) return 'bg-amber-400'
  return 'bg-green-500'
}

function interpret(key: string, v: number): string {
  if (key === 'I1') return v >= 2 ? '고위험 도메인에 해당합니다.' : '일반적 분야 위험입니다.'
  if (key === 'I2') return v >= 2 ? '직접적 위해 가능성이 있습니다.' : '직접 위해 신호는 낮습니다.'
  if (key === 'I3') return v >= 2 ? '취약성·긴급성을 고려해야 합니다.' : '긴급성은 상대적으로 낮습니다.'
  return v >= 2 ? 'AI 의존·결정 위임 위험이 있습니다.' : '자율 판단 여지가 큰 편입니다.'
}

export function EthicalIssueOverview({ input }: { input: QuestionRiskContext }) {
  const items = [
    ['I1 분야 위험도', 'I1', input.I1_domain_risk],
    ['I2 직접적 위해 가능성', 'I2', input.I2_harm_potential],
    ['I3 취약성·긴급성', 'I3', input.I3_vulnerability_urgency],
    ['I4 AI 의존·결정 위임', 'I4', input.I4_ai_dependence_risk],
  ] as const

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">상황·보호 맥락</h3>
        <p className="text-xs text-muted-foreground">
          사용자를 도덕적으로 평가하지 않습니다. 도메인 기준으로 AI 응답에 필요한 보호 맥락을
          분석합니다.
          {input.inferred ? ' (I1–I4는 도메인 기반 추정값)' : ''}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(([label, key, value]) => (
          <div key={key} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{label}</p>
              <Badge className="border-slate-300 bg-white">{value}/3</Badge>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barColor(value)}`}
                style={{ width: `${(value / 3) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{interpret(key, value)}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
