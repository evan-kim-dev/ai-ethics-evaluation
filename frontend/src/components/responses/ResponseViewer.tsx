import { ConditionBadge } from '@/components/responses/ConditionBadge'
import { Card } from '@/components/ui/card'
import type { AIResponse } from '@/types/response'
import { formatDateTime } from '@/utils/format'

export function ResponseViewer({ response }: { response: AIResponse }) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ConditionBadge condition={response.condition} />
        <span className="text-xs text-muted-foreground">
          응답 #{response.id} · {response.model_name} · {formatDateTime(response.created_at)}
        </span>
      </div>
      <div className="whitespace-pre-wrap rounded-md bg-muted px-4 py-3 text-sm leading-relaxed">
        {response.response_text}
      </div>
    </Card>
  )
}
