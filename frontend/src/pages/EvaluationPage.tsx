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

  return (
    <div className="space-y-6">
      <PageTitle
        title="Baseline 별점 평가"
        description="질문을 고르면 저장된 3조건 응답을 불러오고, Baseline에 별점·코멘트를 남깁니다."
      />

      {questionsError ? <ErrorAlert message={questionsError} /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">질문 선택</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            도메인별로 질문을 고르면, 아래에 저장된 응답과 별점 칸이 열립니다.
          </p>
        </div>

        {questionsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner /> 질문 불러오는 중...
          </div>
        ) : (
          <DomainQuestionPicker
            questions={questions}
            value={questionId}
            onChange={setQuestionId}
            defaultExpandAll
          />
        )}

        {selectedQuestion ? (
          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  선택 질문 #{selectedQuestion.id}
                  {currentIndex >= 0 ? (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      ({currentIndex + 1} / {questionIds.length})
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {selectedQuestion.text}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {loadingResponse ? (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <LoadingSpinner /> 응답 불러오는 중
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  disabled={currentIndex <= 0}
                  onClick={goPrev}
                >
                  이전
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  disabled={currentIndex < 0 || currentIndex >= questionIds.length - 1}
                  onClick={goNext}
                >
                  다음
                </Button>
              </div>
            </div>

            {!loadingResponse && !hasAnyResponse ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                이 질문에 저장된 실험 응답이 없습니다.{' '}
                <Link to="/ethics-workspace" className="underline">
                  윤리 워크스페이스
                </Link>
                에서 먼저 실행하세요.
              </div>
            ) : null}

            {hasAnyResponse ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {CONDITIONS.map((condition) => {
                  const response = conditionResponses[condition]
                  const meta = CONDITION_META[condition]
                  const isBaseline = condition === 'baseline'
                  return (
                    <div
                      key={condition}
                      className={cn(
                        'flex min-h-0 flex-col gap-3 rounded-xl border px-3 py-3',
                        isBaseline
                          ? 'border-amber-300/90 bg-gradient-to-b from-amber-50 to-white'
                          : 'border-border/90 bg-gradient-to-b from-slate-50 to-white',
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            'w-fit rounded-md border px-2 py-0.5 text-xs font-medium',
                            meta.badgeClass,
                          )}
                        >
                          {meta.label}
                        </span>
                        {isBaseline ? (
                          <span className="text-xs font-medium text-amber-800">
                            별점 · 코멘트 대상
                          </span>
                        ) : null}
                      </div>

                      {response ? (
                        <p className="max-h-[28rem] flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                          {response.response_text}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">이 조건 응답 없음</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null}

            {baseline ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-amber-200 bg-amber-50/30 px-4 py-4">
                  <BaselineStarRatingForm
                    key={`${baseline.id}-${rating?.id ?? 'new'}`}
                    existing={rating}
                    embedded
                    onSubmit={handleSaveRating}
                  />
                </div>
                <ShareLinkPanel
                  responseId={baseline.id}
                  questionId={selectedQuestion.id}
                  questionText={selectedQuestion.text}
                  baselineResponse={baseline.response_text}
                />
              </div>
            ) : !loadingResponse && hasAnyResponse ? (
              <p className="text-sm text-muted-foreground">
                Baseline 응답이 없어 별점을 남길 수 없습니다.
              </p>
            ) : null}


            {!hasAnyResponse && !loadingResponse ? (
              <Link to="/ethics-workspace">
                <Button variant="secondary">윤리 워크스페이스로 이동</Button>
              </Link>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  )
}
