import { Card } from '@/components/ui/card'
import { formatDelta, interpretDelta } from '@/utils/risk'

export function RiskDeltaCard({
  title,
  delta,
  detail,
}: {
  title: string
  delta: number | null
  detail: string
}) {
  const interp = interpretDelta(delta)
  return (
    <Card>
      <p className="text-sm font-medium">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${interp.className}`}>{formatDelta(delta)}</p>
      <p className={`text-sm ${interp.className}`}>{interp.label}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </Card>
  )
}
