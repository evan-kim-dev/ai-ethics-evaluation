import { useEffect, useState } from 'react'

import { fetchGroundedPromptClaims, type GroundedPromptClaim } from '@/api/grounding'
import { Card } from '@/components/ui/card'

export function GroundedPromptClaimsPanel({ compact = false }: { compact?: boolean }) {
  const [claims, setClaims] = useState<GroundedPromptClaim[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchGroundedPromptClaims()
      .then((payload) => {
        if (cancelled) return
        setClaims(payload.claims)
        setNote(payload.note)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '시스템 프롬프트 근거를 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">시스템 프롬프트 근거 발췌</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {note ||
            'AI 윤리 + 불교 행동 조건의 시스템 프롬프트에 넣은 문헌 발췌입니다. 응답의 검색된 출처(RAG)와는 다른 목록입니다.'}
        </p>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">발췌 불러오는 중...</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!loading && !error ? (
        <ul className="space-y-3">
          {claims.map((claim) => (
            <li
              key={`${claim.source_id}-${claim.concept}-${claim.paper_section_hint}`}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-foreground">[{claim.source_id}]</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{claim.concept_label}</span>
                <span className="text-muted-foreground">{claim.axes.join(' · ')}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{claim.excerpt}</p>
              {claim.paper_section_hint ? (
                <p className="mt-1 text-xs font-medium text-foreground">위치 {claim.paper_section_hint}</p>
              ) : null}
              {!compact && claim.behavior_rule ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{claim.behavior_rule}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {claim.author}
                {claim.year ? ` (${claim.year})` : ''}. {claim.title}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}
