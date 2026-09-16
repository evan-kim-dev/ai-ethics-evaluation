import { Card } from '@/components/ui/card'

export function AutoInsightPanel({ insights }: { insights: string[] }) {
  return (
    <Card>
      <h3 className="mb-3 text-base font-semibold">핵심 관찰</h3>
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
