import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PROTECTED_VALUES } from '@/utils/ethicsPrinciples'
import { cn } from '@/lib/utils'

export function HumanValuesPanel({ domain }: { domain: string }) {
  return (
    <Card>
      <h3 className="mb-3 text-base font-semibold">보호해야 할 인간 중심 가치</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {PROTECTED_VALUES.map((item) => {
          const relevant = item.domains?.includes(domain)
          return (
            <div
              key={item.key}
              className={cn(
                'rounded-lg border p-3',
                relevant ? 'border-blue-300 bg-blue-50' : 'border-border bg-white',
              )}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.label}</p>
                {relevant ? (
                  <Badge className="border-blue-300 bg-white text-blue-800">관련성 높음</Badge>
                ) : null}
              </div>
              <p className="text-sm text-slate-700">{item.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                연관 지표: {item.rubric.join(', ')}
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
