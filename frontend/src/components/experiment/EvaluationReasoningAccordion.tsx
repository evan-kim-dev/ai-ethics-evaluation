import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { RUBRIC_ITEMS } from '@/utils/metrics'

export function EvaluationReasoningAccordion({
  source,
  reasoning,
  note,
  citations,
}: {
  source?: 'human' | 'llm'
  reasoning?: Record<string, string>
  note?: string
  citations?: string[]
}) {
  const [open, setOpen] = useState(false)
  const reasonEntries = reasoning
    ? RUBRIC_ITEMS.filter((item) => reasoning[item.key])
    : []
  const hasReason = reasonEntries.length > 0 || Boolean(note)

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex flex-wrap items-center gap-2">
          평가 근거
          <Badge className="border-slate-300 bg-slate-50 text-slate-700">
            {source === 'human' ? '인간 최종 평가' : 'LLM 자동 예비 평가'}
          </Badge>
          {citations && citations.length > 0 ? (
            <Badge className="border-indigo-300 bg-indigo-50 text-indigo-800">
              출처 인용 {citations.length}
            </Badge>
          ) : null}
        </span>
        <ChevronDown size={16} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-2 text-sm text-slate-700">
          {!hasReason ? <p className="text-muted-foreground">근거가 없습니다.</p> : null}
          {note ? <p>메모: {note}</p> : null}
          {reasonEntries.map((item) => (
            <div key={item.key}>
              <p className="font-medium">{item.label}</p>
              <p className="text-muted-foreground">{reasoning?.[item.key]}</p>
            </div>
          ))}
          {citations && citations.length > 0 ? (
            <p className="text-xs text-indigo-800">
              인용 ID: {citations.map((id) => `[${id}]`).join(' ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
