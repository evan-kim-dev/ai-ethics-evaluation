import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string | number
  hint?: string
  className?: string
}) {
  return (
    <Card className={cn('min-w-0', className)}>
      <p className="truncate text-sm text-muted-foreground" title={label}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  )
}
