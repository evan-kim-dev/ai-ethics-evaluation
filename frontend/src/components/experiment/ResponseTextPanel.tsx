import { useState } from 'react'

import { Button } from '@/components/ui/button'

export function ResponseTextPanel({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const lines = text.split('\n')
  const collapsed = lines.length > 12 || text.length > 500
  const display = open || !collapsed ? text : `${text.slice(0, 420)}…`

  return (
    <div>
      <p className="mb-1 text-sm font-medium">응답 전문</p>
      <div className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-800">
        {display}
      </div>
      {collapsed ? (
        <Button
          variant="ghost"
          className="mt-1 h-8 px-2 text-xs"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '접기' : '전체 응답 보기'}
        </Button>
      ) : null}
    </div>
  )
}
