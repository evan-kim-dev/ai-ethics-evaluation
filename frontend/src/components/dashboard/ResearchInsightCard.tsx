import { Card } from '@/components/ui/card'

export function ResearchInsightCard({ insights }: { insights: string[] }) {
  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">기술통계 관찰</h2>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        저장된 S의 대소만 적습니다. 교리의 우열이나 통계적 유의는 의미하지 않습니다. 논문 본문은 ΔS를
        기준으로 씁니다.
      </p>
      <ul className="space-y-2">
        {insights.map((line) => (
          <li
            key={line}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          >
            {line}
          </li>
        ))}
      </ul>
    </Card>
  )
}
