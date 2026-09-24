import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { fetchLatestComparisons } from '@/api/experiments'
import { fetchQuestions } from '@/api/questions'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ExperimentComparison, ConditionComparisonSide } from '@/types/experiment'
import type { Question } from '@/types/question'
import { CONDITION_META, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'

type Slide = {
  question: Question
  comparison: ExperimentComparison | null
}

const SIDE_KEYS: Condition[] = [
  'baseline',
  'ai_ethics_guided',
  'ai_ethics_buddhist_guided',
]

function buddhistSide(comparison: ExperimentComparison | null): ConditionComparisonSide | null {
  if (!comparison) return null
  return (
    comparison.ai_ethics_buddhist_guided ??
    comparison.buddhist_ethics_guided ??
    comparison.buddhist_guided ??
    null
  )
}

function sideFor(comparison: ExperimentComparison | null, condition: Condition) {
  if (!comparison) return null
  if (condition === 'baseline') return comparison.baseline
  if (condition === 'ai_ethics_guided') return comparison.ai_ethics_guided ?? null
  return buddhistSide(comparison)
}

function safetyOf(side: ConditionComparisonSide | null): number | null {
  const score = side?.risk_result?.overall_safety_score
  return score == null ? null : score
}

export function ReviewWalkPage() {
  const [params, setParams] = useSearchParams()
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchQuestions({ limit: 500 }), fetchLatestComparisons()])
      .then(([questionPage, comparisons]) => {
        if (cancelled) return
        const byQuestion = new Map<number, ExperimentComparison>()
        for (const comparison of comparisons) {
          byQuestion.set(comparison.question_id, comparison)
        }
        const next = [...questionPage.items]
          .sort((a, b) => a.id - b.id)
          .map((question) => ({
            question,
            comparison: byQuestion.get(question.id) ?? null,
          }))
        setSlides(next)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '질문과 응답을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const requested = Number(params.get('n'))
  const position = Number.isFinite(requested) && requested >= 1 ? Math.floor(requested) : 1
  const index = slides.length === 0 ? 0 : Math.min(position, slides.length) - 1
  const slide = slides[index] ?? null

  const go = (nextPosition: number) => {
    if (slides.length === 0) return
    const clamped = Math.min(slides.length, Math.max(1, nextPosition))
    if (clamped === 1) setParams({}, { replace: false })
    else setParams({ n: String(clamped) }, { replace: false })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowLeft') go(position - 1)
      if (event.key === 'ArrowRight') go(position + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const url = new URL('/review', window.location.origin)
    if (position > 1) url.searchParams.set('n', String(position))
    return url.toString()
  }, [position])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoadingSpinner /> 질문과 응답을 불러오는 중...
      </p>
    )
  }

  if (error) return <ErrorAlert message={error} />

  if (!slide) {
    return <ErrorAlert message="보여줄 질문이 없습니다." />
  }

  const domain = DOMAIN_LABELS[slide.question.domain] ?? slide.question.domain

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[32rem] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">질문 넘겨보기</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            질문 하나와 세 조건 답변입니다. 이전·다음 또는 방향키로 전체를 넘길 수 있습니다.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void copyLink()}>
          <Link2 className="size-4" />
          {copied ? '링크를 복사했습니다' : '이 화면 링크 복사'}
        </Button>
      </div>

      <Card className="shrink-0 py-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
          {index + 1} / {slides.length} · {domain}
        </p>
        <p className="mt-2 max-h-28 overflow-auto text-[15px] leading-relaxed whitespace-pre-wrap">
          {slide.question.text}
        </p>
      </Card>

      <div
        key={slide.question.id}
        className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3"
      >
        {SIDE_KEYS.map((condition) => {
          const meta = CONDITION_META[condition]
          const side = sideFor(slide.comparison, condition)
          const safety = safetyOf(side)
          return (
            <Card key={condition} className="flex min-h-0 flex-col p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{meta.label}</h2>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block text-[11px] text-muted-foreground">S</span>
                  <span className="text-lg font-bold text-accent">
                    {safety == null ? '-' : safety.toFixed(2)}
                  </span>
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-muted px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                {side?.response.response_text ?? '이 조건의 응답이 없습니다.'}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3">
        <Button variant="secondary" disabled={index === 0} onClick={() => go(position - 1)}>
          <ChevronLeft className="size-4" />
          이전
        </Button>
        <p className="text-sm font-semibold text-muted-foreground">
          {index + 1} / {slides.length}
        </p>
        <Button
          variant="secondary"
          disabled={index >= slides.length - 1}
          onClick={() => go(position + 1)}
        >
          다음
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
