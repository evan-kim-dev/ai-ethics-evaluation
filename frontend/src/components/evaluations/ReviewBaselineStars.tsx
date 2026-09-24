import { useEffect, useState } from 'react'

import {
  createBaselineRating,
  fetchBaselineRating,
  updateBaselineRating,
} from '@/api/evaluations'
import { StarRatingInput } from '@/components/evaluations/StarRatingInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BaselineRating } from '@/types/evaluation'

const EVALUATOR_STORAGE_KEY = 'baseline_rater_id'

function readEvaluatorId(): string {
  try {
    return localStorage.getItem(EVALUATOR_STORAGE_KEY)?.trim() || 'researcher'
  } catch {
    return 'researcher'
  }
}

export function ReviewBaselineStars({ responseId }: { responseId: number | null }) {
  const [evaluatorId, setEvaluatorId] = useState(readEvaluatorId)
  const [appliedEvaluator, setAppliedEvaluator] = useState(readEvaluatorId)
  const [starRating, setStarRating] = useState(3)
  const [existing, setExisting] = useState<BaselineRating | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (responseId == null) {
      setExisting(null)
      setStarRating(3)
      return
    }
    let cancelled = false
    const evaluator = appliedEvaluator.trim() || 'researcher'
    setLoading(true)
    setError(null)
    setSuccess(null)
    fetchBaselineRating(responseId, evaluator)
      .then((rating) => {
        if (cancelled) return
        setExisting(rating)
        setStarRating(rating?.star_rating ?? 3)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setExisting(null)
        setError(err instanceof Error ? err.message : '별점을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [responseId, appliedEvaluator])

  const save = async () => {
    if (responseId == null) return
    const evaluator = evaluatorId.trim() || 'researcher'
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = existing
        ? await updateBaselineRating(existing.id, {
            star_rating: starRating,
            evaluator_id: evaluator,
            note: existing.note,
          })
        : await createBaselineRating(responseId, {
            star_rating: starRating,
            evaluator_id: evaluator,
            note: '',
          })
      setExisting(saved)
      setStarRating(saved.star_rating)
      try {
        localStorage.setItem(EVALUATOR_STORAGE_KEY, evaluator)
      } catch {
        /* ignore */
      }
      setSuccess('저장했습니다')
    } catch (err) {
      setError(err instanceof Error ? err.message : '별점 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (responseId == null) {
    return (
      <p className="text-sm text-muted-foreground">Baseline 응답이 없어 별점을 남길 수 없습니다.</p>
    )
  }

  return (
    <div className="w-full shrink-0 space-y-3 md:w-80">
      <div>
        <p className="text-sm font-semibold">Baseline 별점</p>
        <p className="text-xs text-muted-foreground">S에는 들어가지 않는 보조 평가입니다.</p>
      </div>
      <StarRatingInput value={starRating} onChange={setStarRating} disabled={loading || submitting} />
      <Input
        value={evaluatorId}
        onChange={(event) => setEvaluatorId(event.target.value)}
        onBlur={() => setAppliedEvaluator(evaluatorId.trim() || 'researcher')}
        placeholder="평가자 ID"
        aria-label="평가자 ID"
        disabled={submitting}
      />
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-success">{success}</p> : null}
      <Button type="button" onClick={() => void save()} disabled={loading || submitting}>
        {submitting ? '저장 중...' : existing ? '별점 수정' : '별점 저장'}
      </Button>
    </div>
  )
}
