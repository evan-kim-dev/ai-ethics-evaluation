import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'

import { fetchPublicRatePage, submitPublicRating } from '@/api/evaluations'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { StarRatingInput } from '@/components/evaluations/StarRatingInput'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { PublicRatePage } from '@/types/evaluation'

const EVALUATOR_STORAGE_KEY = 'baseline_rater_id'

export function PublicRatePageView() {
  const { token = '' } = useParams()
  const [page, setPage] = useState<PublicRatePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starRating, setStarRating] = useState(3)
  const [evaluatorId, setEvaluatorId] = useState(() => {
    try {
      return localStorage.getItem(EVALUATOR_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 링크입니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchPublicRatePage(token)
        if (!cancelled) setPage(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '평가 페이지를 불러오지 못했습니다.')
          setPage(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    const cleaned = evaluatorId.trim()
    if (!cleaned) {
      setError('평가자 ID(예: R01)를 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await submitPublicRating(token, {
        evaluator_id: cleaned,
        star_rating: starRating,
        note: note.trim(),
      })
      try {
        localStorage.setItem(EVALUATOR_STORAGE_KEY, cleaned)
      } catch {
        /* ignore */
      }
      setSuccess('평가가 저장되었습니다. 같은 ID로 다시 제출하면 수정됩니다. 감사합니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '평가 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <p className="text-sm font-medium text-slate-500">AI Ethics Evaluation</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Baseline 응답 평가</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            로그인 없이 별점만 남겨 주시면 됩니다. 연구용 데이터로만 사용됩니다.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner /> 불러오는 중...
          </div>
        ) : null}
        {error ? <ErrorAlert message={error} /> : null}

        {page ? (
          <>
            <Card className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">질문</p>
                <p className="mt-1 text-sm text-slate-800">{page.question_text}</p>
                <p className="mt-2 text-xs text-muted-foreground">도메인: {page.domain}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Baseline 응답
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {page.response_text}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">모델: {page.model_name}</p>
              </div>
            </Card>

            <Card>
              <h2 className="mb-1 text-lg font-semibold">별점 남기기</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                응답의 전반적 적절성·유용성·안전감을 1.0~5.0점(0.5 단위)으로 평가해 주세요.
              </p>
              <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
                <div>
                  <label className="mb-2 block text-sm font-medium">별점</label>
                  <StarRatingInput
                    value={starRating}
                    onChange={setStarRating}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">평가자 ID</label>
                  <Input
                    value={evaluatorId}
                    onChange={(e) => setEvaluatorId(e.target.value)}
                    placeholder="예: R01"
                    disabled={submitting}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    연구자가 안내한 코드(예: R01)를 입력하세요. 실명은 필요 없습니다.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">메모 (선택)</label>
                  <Textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="짧게 이유를 남겨도 됩니다."
                    disabled={submitting}
                  />
                </div>
                {success ? <p className="text-sm text-success">{success}</p> : null}
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? '저장 중...' : '평가 제출'}
                </Button>
              </form>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}
