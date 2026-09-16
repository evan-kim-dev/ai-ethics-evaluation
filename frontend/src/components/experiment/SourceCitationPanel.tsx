import { useState } from 'react'
import { BookMarked, ChevronDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { SourceCitation } from '@/types/comparison'

export function SourceCitationPanel({
  title = '검색된 출처 (RAG)',
  sources,
  citedIds,
  defaultOpen = false,
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
            return (
              <li
                key={src.id}
                className={`rounded-md border px-2.5 py-2 text-xs ${
                  isCited
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-indigo-100 bg-white'
                }`}
              >
                <p className="font-semibold text-slate-800">
                  [{src.id}] {src.title}
                  {isCited ? (
                    <span className="ml-2 font-medium text-emerald-700">인용됨</span>
                  ) : null}
                </p>
                {src.text ? (
                  <p className="mt-1 leading-relaxed text-slate-600">{src.text}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
