import { Card } from '@/components/ui/card'
import { SourceCitationPanel } from '@/components/experiment/SourceCitationPanel'
import type { LLMEvaluation } from '@/types/evaluation'
import type { SourceCitation } from '@/types/comparison'
import { RUBRIC_OPTIONS } from '@/utils/constants'

function parseReasoningBundle(raw: string): {
  reasoning: Record<string, string>
  citations: string[]
  sources: SourceCitation[]
} {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { reasoning: {}, citations: [], sources: [] }
    }
    const obj = parsed as Record<string, unknown>
    const meta =
      obj._meta && typeof obj._meta === 'object' && !Array.isArray(obj._meta)
        ? (obj._meta as Record<string, unknown>)
        : null
    const reasoning: Record<string, string> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_meta') continue
      if (typeof value === 'string') reasoning[key] = value
    }
    const citations = Array.isArray(meta?.citations)
      ? meta.citations.map(String)
      : []
    const sources: SourceCitation[] = []
    if (Array.isArray(meta?.retrieved_sources)) {
      for (const item of meta.retrieved_sources) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        if (typeof row.id === 'string' && typeof row.title === 'string') {
          sources.push({
            id: row.id,
            title: row.title,
            text: typeof row.text === 'string' ? row.text : undefined,
          })
        }
      }
    }
    return { reasoning, citations, sources }
  } catch {
    return { reasoning: {}, citations: [], sources: [] }
  }
}

function safeParseList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return parsed.map(String)
    }
  } catch {
    // ignore
  }
  return []
}

export function LlmEvaluationCard({ evaluation }: { evaluation: LLMEvaluation }) {
  const { reasoning, citations, sources } = parseReasoningBundle(evaluation.reasoning_json)
  const signals = safeParseList(evaluation.risk_signals_json)

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">LLM 예비 평가</h3>
          <p className="text-xs text-muted-foreground">
            자동 예비평가 · confidence {evaluation.confidence.toFixed(2)}
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
          evaluator: {evaluation.evaluator_type}
        </span>
      </div>

      <SourceCitationPanel
        title="평가 RAG 출처"
        sources={sources}
        citedIds={citations}
        defaultOpen
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {RUBRIC_OPTIONS.map((item) => (
          <div key={item.key} className="rounded-md bg-muted px-2 py-2 text-center">
            <p className="text-[11px] text-muted-foreground">{item.key}</p>
            <p className="text-lg font-semibold">{evaluation[item.key]}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {RUBRIC_OPTIONS.map((item) => (
          <div key={item.key} className="rounded-md border border-border px-3 py-2">
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {reasoning[item.key] || '근거 없음'}
            </p>
          </div>
        ))}
      </div>

      {citations.length > 0 ? (
        <p className="text-xs text-indigo-800">
          인용 ID: {citations.map((id) => `[${id}]`).join(' ')}
        </p>
      ) : null}

      {signals.length > 0 ? (
        <div>
          <p className="mb-1 text-sm font-medium">위험 신호</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {signals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}
