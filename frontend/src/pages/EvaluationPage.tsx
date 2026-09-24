import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  createBaselineRating,
  fetchBaselineRating,
  updateBaselineRating,
} from '@/api/evaluations'
import { fetchQuestionResponses, fetchResponse } from '@/api/responses'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PageTitle } from '@/components/common/PageTitle'
import { BaselineStarRatingForm } from '@/components/evaluations/BaselineStarRatingForm'
import { ShareLinkPanel } from '@/components/evaluations/ShareLinkPanel'
import { DomainQuestionPicker } from '@/components/questions/DomainQuestionPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useQuestions } from '@/hooks/useQuestions'
import type { BaselineRating, BaselineRatingInput } from '@/types/evaluation'
import type { AIResponse } from '@/types/response'
import { CONDITION_META, CONDITIONS, normalizeCondition, type Condition } from '@/utils/condition'
import { cn } from '@/lib/utils'

type ConditionResponses = Partial<Record<Condition, AIResponse>>

function pickLatestConditionResponses(items: AIResponse[]): ConditionResponses {
  const next: ConditionResponses = {}
  const sorted = [...items].sort((a, b) => b.id - a.id)
  for (const item of sorted) {
    const key = normalizeCondition(item.condition)
    if (!key || next[key]) continue
    next[key] = item
  }
  return next
}

export function EvaluationPage() {
  const { questions, loading: questionsLoading, error: questionsError } = useQuestions()
  const [searchParams] = useSearchParams()
  const responseIdParam = searchParams.get('responseId')

  const [questionId, setQuestionId] = useState<number | ''>('')
  const [conditionResponses, setConditionResponses] = useState<ConditionResponses>({})
  const [rating, setRating] = useState<BaselineRating | null>(null)
  const [loadingResponse, setLoadingResponse] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  const questionIds = useMemo(() => questions.map((q) => q.id), [questions])
  const currentIndex = useMemo(
    () => (questionId === '' ? -1 : questionIds.indexOf(questionId)),
    [questionIds, questionId],
  )

  const goPrev = () => {
    if (currentIndex <= 0) return
    setQuestionId(questionIds[currentIndex - 1])
  }
  const goNext = () => {
    if (currentIndex < 0 || currentIndex >= questionIds.length - 1) return
    setQuestionId(questionIds[currentIndex + 1])
  }

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === questionId) ?? null,
    [questions, questionId],
  )
  const baseline = conditionResponses.baseline ?? null
  const hasAnyResponse = CONDITIONS.some((c) => conditionResponses[c])

  useEffect(() => {
    if (bootstrapped || !responseIdParam) return
    let cancelled = false
    void (async () => {
      try {
        const response = await fetchResponse(Number(responseIdParam))
        if (cancelled) return
        setQuestionId(response.question_id)
      } finally {
        if (!cancelled) setBootstrapped(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [responseIdParam, bootstrapped])

  useEffect(() => {
    if (questions.length > 0 && questionId === '' && !responseIdParam) {
      setQuestionId(questions[0].id)
    }
  }, [questions, questionId, responseIdParam])

  useEffect(() => {
    if (questionId === '') {
      setConditionResponses({})
      setRating(null)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoadingResponse(true)
      setError(null)
      try {
        const data = await fetchQuestionResponses(questionId)
        if (cancelled) return
        const next = pickLatestConditionResponses(data.items)
        setConditionResponses(next)

        if (next.baseline) {
          try {
            setRating(await fetchBaselineRating(next.baseline.id))
          } catch {
            setRating(null)
          }
        } else {
          setRating(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '저장된 응답을 불러오지 못했습니다.')
          setConditionResponses({})
          setRating(null)
        }
      } finally {
        if (!cancelled) setLoadingResponse(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [questionId])

  const handleSaveRating = async (payload: BaselineRatingInput) => {
    if (!baseline) {
      throw new Error('저장된 Baseline 응답이 없습니다.')
    }
    const saved = rating
      ? await updateBaselineRating(rating.id, payload)
      : await createBaselineRating(baseline.id, payload)
    setRating(saved)
  }

  const compareConditions = CONDITIONS.filter((condition) => condition !== 'baseline')

  return (
    <div className="space-y-6">
      <PageTitle
        title="Baseline 별점"
        description="저장된 Baseline 응답만 사람이 1.0–5.0점으로 평가합니다. 루브릭 S와는 별도입니다."
      />

      {questionsError ? <ErrorAlert message={questionsError} /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="space-y-3 lg:sticky lg:top-20">
          <div>
            <h2 className="text-sm font-bold">질문</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">도메인을 펼쳐 고르세요.</p>
          </div>
          {questionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner /> 불러오는 중
            </div>
          ) : (
            <DomainQuestionPicker questions={questions} value={questionId} onChange={setQuestionId} />
          )}
        </Card>

        <div className="space-y-4">
          {selectedQuestion ? (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                    질문 #{selectedQuestion.id}
                    {currentIndex >= 0 ? ` · ${currentIndex + 1}/${questionIds.length}` : ''}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed">{selectedQuestion.text}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="secondary" className="h-9 px-3" disabled={currentIndex <= 0} onClick={goPrev}>
                    이전
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-3"
                    disabled={currentIndex < 0 || currentIndex >= questionIds.length - 1}
                    onClick={goNext}
                  >
                    다음
                  </Button>
                </div>
              </div>
              {loadingResponse ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoadingSpinner /> 응답 불러오는 중
                </p>
              ) : null}
            </Card>
          ) : null}

          {!loadingResponse && selectedQuestion && !hasAnyResponse ? (
            <Card className="space-y-3">
              <p className="text-sm text-muted-foreground">이 질문에 저장된 실험 응답이 없습니다.</p>
              <Link to="/ethics-workspace">
                <Button variant="secondary">3조건 윤리 분석으로 이동</Button>
              </Link>
            </Card>
          ) : null}

          {selectedQuestion && baseline ? (
            <>
              <Card className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', CONDITION_META.baseline.badgeClass)}>
                    {CONDITION_META.baseline.label}
                  </span>
                  <span className="text-xs font-medium text-accent">별점 대상</span>
                </div>
                <p className="max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                  {baseline.response_text}
                </p>
              </Card>

              <details className="rounded-[24px] border border-border bg-card px-5 py-4">
                <summary className="cursor-pointer text-sm font-semibold">다른 조건 응답 비교</summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {compareConditions.map((condition) => {
                    const response = conditionResponses[condition]
                    const meta = CONDITION_META[condition]
                    return (
                      <div key={condition} className="rounded-2xl bg-muted px-3 py-3">
                        <span className={cn('rounded-full border bg-white px-2 py-0.5 text-xs font-semibold', meta.badgeClass)}>
                          {meta.shortLabel}
                        </span>
                        <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                          {response?.response_text ?? '이 조건 응답 없음'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </details>

              <Card>
                <h2 className="text-base font-bold">연구자 별점</h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  별 왼쪽은 0.5, 오른쪽은 1.0입니다. 슬라이더로도 맞출 수 있습니다.
                </p>
                <BaselineStarRatingForm
                  key={`${baseline.id}-${rating?.id ?? 'new'}`}
                  existing={rating}
                  embedded
                  onSubmit={handleSaveRating}
                />
              </Card>

              <ShareLinkPanel
                responseId={baseline.id}
                questionId={selectedQuestion.id}
                questionText={selectedQuestion.text}
                baselineResponse={baseline.response_text}
              />
            </>
          ) : !loadingResponse && hasAnyResponse ? (
            <p className="text-sm text-muted-foreground">Baseline 응답이 없어 별점을 남길 수 없습니다.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
