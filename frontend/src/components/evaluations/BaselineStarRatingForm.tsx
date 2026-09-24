import { useState, type FormEvent } from 'react'

import { StarRatingInput } from '@/components/evaluations/StarRatingInput'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { BaselineRating, BaselineRatingInput } from '@/types/evaluation'

export function BaselineStarRatingForm({
  existing,
  onSubmit,
  embedded = false,
}: {
  existing?: BaselineRating | null
  onSubmit: (payload: BaselineRatingInput) => Promise<void>
  embedded?: boolean
}) {
  const [starRating, setStarRating] = useState(existing?.star_rating ?? 3)
  const [note, setNote] = useState(existing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await onSubmit({
        star_rating: starRating,
        evaluator_id: existing?.evaluator_id?.trim() || 'researcher',
        note: note.trim(),
      })
      setSuccess(existing ? '수정되었습니다.' : '연구자 별점이 저장되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const body = (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {!embedded ? (
        <div>
          <h3 className="text-base font-bold tracking-tight">연구자 별점</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Baseline만 평가합니다. S 점수에는 반영되지 않는 보조 기록입니다.
          </p>
        </div>
      ) : null}

      <StarRatingInput value={starRating} onChange={setStarRating} disabled={submitting} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold">코멘트</label>
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="좋은 점, 아쉬운 점을 한두 문장으로"
          disabled={submitting}
        />
      </div>

      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-success">{success}</p> : null}

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? '저장 중...' : existing ? '별점 수정' : '별점 저장'}
      </Button>
    </form>
  )

  if (embedded) return body
  return <Card>{body}</Card>
}
