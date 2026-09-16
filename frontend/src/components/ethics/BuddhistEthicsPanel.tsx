import { Card } from '@/components/ui/card'
import { BUDDHIST_ETHICS } from '@/utils/ethicsPrinciples'

export function BuddhistEthicsPanel() {
  return (
    <Card>
      <h3 className="mb-3 text-base font-semibold">불교철학 관점</h3>
      <div className="grid gap-3 lg:grid-cols-3">
        {BUDDHIST_ETHICS.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-purple-200 bg-purple-50/50 p-3"
          >
            <p className="font-semibold text-purple-900">{item.label}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
              {item.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              관련 루브릭: {item.rubric.join(', ')}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
