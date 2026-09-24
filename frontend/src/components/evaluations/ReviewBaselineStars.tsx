import { useEffect, useRef, useState } from 'react'

import { createBaselineRating, fetchBaselineRating } from '@/api/evaluations'
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

export function ReviewBaselineStars({
  responseId,
  lockedEvaluatorId,
  requireSelection = false,
  bindSave,
}: {
  responseId: number | null
  lockedEvaluatorId?: string
  requireSelection?: boolean
  bindSave?: (save: () => Promise<boolean>) => void
}) {
  const [evaluatorId, setEvaluatorId] = useState(lockedEvaluatorId ?? readEvaluatorId)
  const [appliedEvaluator, setAppliedEvaluator] = useState(lockedEvaluatorId ?? readEvaluatorId)
  const [starRating, setStarRating] = useState<number | null>(requireSelection ? null : 3)
  const [existing, setExisting] = useState<BaselineRating | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const stateRef = useRef({
    responseId,
    starRating,
    existing,
    evaluatorId: lockedEvaluatorId ?? evaluatorId,
    requireSelection,
  })

  useEffect(() => {
    if (lockedEvaluatorId) {
      setEvaluatorId(lockedEvaluatorId)
      setAppliedEvaluator(lockedEvaluatorId)
    }
  }, [lockedEvaluatorId])

  stateRef.current = {
    responseId,
    starRating,
    existing,
    evaluatorId: (lockedEvaluatorId ?? evaluatorId).trim() || 'researcher',
    requireSelection,
  }

  const persistRef = useRef<() => Promise<boolean>>(async () => true)

  const persist = async () => {
    const current = stateRef.current
    if (current.responseId == null) return true
    if (current.starRating == null) {
      setError('별점을 선택한 뒤 다음으로 넘어가 주세요.')
      setSuccess(null)
      return false
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = await createBaselineRating(current.responseId, {
        star_rating: current.starRating,
        evaluator_id: current.evaluatorId,
        note: current.existing?.note ?? '',
      })
      setExisting(saved)
      setStarRating(saved.star_rating)
      try {
        localStorage.setItem(EVALUATOR_STORAGE_KEY, current.evaluatorId)
      } catch {
        /* ignore */
      }
      setSuccess('저장했습니다')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '별점 저장에 실패했습니다.')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  persistRef.current = persist
  useEffect(() => {
    bindSave?.(() => persistRef.current())
  }, [bindSave])

  useEffect(() => {
    if (responseId == null) {
      setExisting(null)
      setStarRating(requireSelection ? null : 3)
      return
    }
    let cancelled = false
    const evaluator = (lockedEvaluatorId ?? appliedEvaluator).trim() || 'researcher'
    setLoading(true)
    setError(null)
    setSuccess(null)
    fetchBaselineRating(responseId, evaluator)
      .then((rating) => {
        if (cancelled) return
        setExisting(rating)
        setStarRating(rating?.star_rating ?? (requireSelection ? null : 3))
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
  }, [responseId, appliedEvaluator, lockedEvaluatorId, requireSelection])

  if (responseId == null) {
    return (
      <p className="text-sm text-muted-foreground">Baseline 응답이 없어 별점을 남길 수 없습니다.</p>
    )
  }

  return (
    <div className="w-full shrink-0 space-y-3 md:w-80">
      <div>
        <p className="text-sm font-semibold">Baseline 별점</p>
        <p className="text-xs text-muted-foreground">
          {requireSelection
            ? '별을 고르고 다음으로 넘기면 이 평가자 이름으로 저장됩니다.'
            : 'S에는 들어가지 않는 보조 평가입니다.'}
        </p>
      </div>
      <StarRatingInput value={starRating} onChange={setStarRating} disabled={loading || submitting} />
      {lockedEvaluatorId ? (
        <p className="text-sm text-muted-foreground">평가자 {lockedEvaluatorId}</p>
      ) : (
        <Input
          value={evaluatorId}
          onChange={(event) => setEvaluatorId(event.target.value)}
          onBlur={() => setAppliedEvaluator(evaluatorId.trim() || 'researcher')}
          placeholder="평가자 ID"
          aria-label="평가자 ID"
          disabled={submitting}
        />
      )}
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-success">{success}</p> : null}
      {!requireSelection ? (
        <Button type="button" onClick={() => void persist()} disabled={loading || submitting}>
          {submitting ? '저장 중...' : existing ? '별점 수정' : '별점 저장'}
        </Button>
      ) : null}
    </div>
  )
}
