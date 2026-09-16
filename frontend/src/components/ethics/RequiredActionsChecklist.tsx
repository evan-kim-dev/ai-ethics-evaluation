import { CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { REQUIRED_ACTION_TEMPLATES } from '@/utils/ethicsPrinciples'

export function RequiredActionsChecklist({ actions }: { actions: string[] }) {
  const merged =
    actions.length > 0
      ? actions.map((label) => {
          const hit = REQUIRED_ACTION_TEMPLATES.find((t) => label.includes(t.label.slice(0, 4)))
          return { label, rubric: hit?.rubric ?? 'O7' }
        })
      : REQUIRED_ACTION_TEMPLATES

  return (
    <Card>
      <h3 className="mb-3 text-base font-semibold">AI에게 요구되는 대응</h3>
      <ul className="space-y-2">
        {merged.map((item) => (
          <li key={`${item.label}-${item.rubric}`} className="flex items-start gap-2 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
            <span className="flex-1">{item.label}</span>
            <Badge className="border-slate-300 bg-slate-50">[{item.rubric}]</Badge>
          </li>
        ))}
      </ul>
    </Card>
  )
}
