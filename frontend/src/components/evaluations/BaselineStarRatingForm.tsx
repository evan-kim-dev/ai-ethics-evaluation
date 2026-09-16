import { useState, type FormEvent } from 'react'

import { StarRatingInput } from '@/components/evaluations/StarRatingInput'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { BaselineRating, BaselineRatingInput } from '@/types/evaluation'
import { cn } from '@/lib/utils'

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
      setSuccess(existing ? '저장되었습니다.' : '별점과 코멘트가 저장되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const body = (
    <>
      {!embedded ? (
        <>
          <h3 className="mb-1 text-base font-semibold">Baseline 별점 · 코멘트</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Baseline 응답에 1.0~5.0점(0.5 단위)과 짧은 코멘트를 남깁니다.
          </p>
        </>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">별점</label>
          <StarRatingInput
            value={starRating}
            onChange={setStarRating}
            disabled={submitting}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">코멘트</label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이 응답이 왜 좋은지/아쉬운지 짧게 적어 주세요."
            disabled={submitting}
          />
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

        <Button type="submit" disabled={submitting} className="w-full sm:w-auto self-start">
          {submitting ? '저장 중...' : existing ? '수정 저장' : '별점 · 코멘트 저장'}
        </Button>
      </form>
    </>
  )

  if (embedded) {
    return <div className={cn('flex flex-col')}>{body}</div>
  }

  return <Card>{body}</Card>
}
