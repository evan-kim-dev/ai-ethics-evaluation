import { Card } from '@/components/ui/card'

export function ResearchInsightCard({ insights }: { insights: string[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold">핵심 결론 요약</h2>
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
