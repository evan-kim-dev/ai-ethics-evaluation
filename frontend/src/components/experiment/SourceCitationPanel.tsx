import { useState } from 'react'
import { BookMarked, ChevronDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { SourceCitation } from '@/types/comparison'

const HINT_RE = /\s*\((p\.[^)]+)\)\s*$/

function excerptBlocks(source: SourceCitation): Array<{ excerpt: string; hint?: string }> {
  const raw = (source.text ?? '').trim()
  if (!raw) return []
  const body = raw.replace(/^문헌 발췌:\s*/, '')
  const parts = body.includes(' | ') ? body.split(' | ') : [body]
  return parts
    .map((part) => {
      const match = part.match(HINT_RE)
      if (!match || match.index == null) return { excerpt: part.trim() }
      return { excerpt: part.slice(0, match.index).trim(), hint: match[1].trim() }
    })
    .filter((block) => block.excerpt)
}

export function SourceCitationPanel({
  title = '검색된 출처 (RAG)',
  sources,
  citedIds,
  defaultOpen = true,
}: {
  title?: string
  sources?: SourceCitation[] | null
  citedIds?: string[] | null
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!sources?.length) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        저장된 RAG 출처가 없습니다. (이전 실험 결과이거나 수동 입력 응답일 수 있습니다)
      </div>
    )
  }

  const cited = new Set(citedIds ?? [])

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-indigo-950"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <BookMarked size={16} />
          {title}
          <Badge className="border-indigo-300 bg-white text-indigo-800">
            {sources.length}건
          </Badge>
          {cited.size > 0 ? (
            <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800">
              인용 {cited.size}
            </Badge>
          ) : null}
        </span>
        <ChevronDown size={16} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>
      {open ? (
        <ul className="space-y-2 border-t border-indigo-100 px-3 py-2">
          {sources.map((src) => {
            const isCited = cited.has(src.id)
            const grounded = src.tags?.includes('grounded') ?? false
            const blocks = excerptBlocks(src)
            return (
              <li
                key={src.id}
                className={`rounded-md border px-2.5 py-2 text-xs ${
                  isCited
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-indigo-100 bg-white'
                }`}
              >
                <p className="font-semibold text-indigo-950">
                  [{src.id}]
                  {grounded ? (
                    <span className="ml-2 font-medium text-indigo-800">시스템 프롬프트 발췌</span>
                  ) : null}
                  {isCited ? (
                    <span className="ml-2 font-medium text-emerald-700">인용됨</span>
                  ) : null}
                </p>
                {blocks.length > 0 ? (
                  <div className="mt-1 space-y-2">
                    {blocks.map((block) => (
                      <div key={`${src.id}-${block.excerpt.slice(0, 24)}`}>
                        <p className="text-sm leading-relaxed text-slate-800">{block.excerpt}</p>
                        {block.hint ? (
                          <p className="mt-0.5 font-medium text-slate-700">위치 {block.hint}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-slate-500">저장된 발췌 문장이 없습니다.</p>
                )}
                <p className="mt-1 text-slate-500">{src.title}</p>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
