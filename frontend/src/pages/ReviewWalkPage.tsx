import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { fetchLatestComparisons } from '@/api/experiments'
import { fetchQuestions } from '@/api/questions'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ReviewBaselineStars } from '@/components/evaluations/ReviewBaselineStars'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

const RATER_STORAGE_KEY = 'baseline_rater_id'

function readStoredRaterId(): string {
  try {
    return localStorage.getItem(RATER_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function ReviewWalkPage({ audience = 'researcher' }: { audience?: 'researcher' | 'rater' }) {
  const [params, setParams] = useSearchParams()
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [moving, setMoving] = useState(false)
  const [finished, setFinished] = useState(false)
  const [raterId, setRaterId] = useState(() => {
    if (audience !== 'rater') return ''
    const stored = readStoredRaterId()
    return stored.toLowerCase() === 'researcher' ? '' : stored
  })
  const [draftRaterId, setDraftRaterId] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)
  const saveRef = useRef<() => Promise<boolean>>(async () => true)
  const movingRef = useRef(false)
  const registerSave = useCallback((save: () => Promise<boolean>) => {
    saveRef.current = save
  }, [])
  const isRater = audience === 'rater'

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

  const go = async (nextPosition: number) => {
    if (slides.length === 0 || movingRef.current) return
    if (isRater) {
      movingRef.current = true
      setMoving(true)
      const saved = await saveRef.current()
      movingRef.current = false
      setMoving(false)
      if (!saved) return
    }
    const clamped = Math.min(slides.length, Math.max(1, nextPosition))
    if (clamped === 1) setParams({}, { replace: false })
    else setParams({ n: String(clamped) }, { replace: false })
  }

  const finish = async () => {
    if (movingRef.current) return
    movingRef.current = true
    setMoving(true)
    const saved = await saveRef.current()
    movingRef.current = false
    setMoving(false)
    if (saved) setFinished(true)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (finished || (isRater && !raterId)) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowLeft') void go(position - 1)
      if (event.key === 'ArrowRight') {
        if (isRater && index >= slides.length - 1) void finish()
        else void go(position + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return new URL('/review/share', window.location.origin).toString()
  }, [])

  const claimRater = (event: FormEvent) => {
    event.preventDefault()
    const cleaned = draftRaterId.trim()
    if (!cleaned) {
      setGateError('평가자 ID를 입력해 주세요. 예: R01')
      return
    }
    if (cleaned.toLowerCase() === 'researcher') {
      setGateError('researcher는 연구자 화면 전용입니다. 다른 ID를 입력해 주세요.')
      return
    }
    try {
      localStorage.setItem(RATER_STORAGE_KEY, cleaned)
    } catch {
      /* ignore */
    }
    setGateError(null)
    setRaterId(cleaned)
  }

  const changeRater = () => {
    try {
      localStorage.removeItem(RATER_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setDraftRaterId('')
    setFinished(false)
    setRaterId('')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const body = (() => {
    if (isRater && !raterId) {
      return (
        <Card className="mx-auto max-w-md p-6">
          <h1 className="text-xl font-bold tracking-tight">평가자 ID</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            같은 ID로 다시 들어오면 이전에 남긴 별점을 이어서 수정할 수 있습니다. 연구자 화면의
            점수를 덮어쓰지 않도록 본인만의 ID를 사용해 주세요.
          </p>
          <form className="mt-4 space-y-3" onSubmit={claimRater}>
            <Input
              value={draftRaterId}
              onChange={(event) => setDraftRaterId(event.target.value)}
              placeholder="예: R01"
              aria-label="평가자 ID"
              autoFocus
            />
            {gateError ? <p className="text-sm font-medium text-danger">{gateError}</p> : null}
            <Button type="submit">평가 시작</Button>
          </form>
        </Card>
      )
    }

    if (loading) {
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner /> 질문과 응답을 불러오는 중...
        </p>
      )
    }

    if (error) return <ErrorAlert message={error} />

    if (!slide) return <ErrorAlert message="보여줄 질문이 없습니다." />

    if (isRater && finished) {
      return (
        <Card className="mx-auto max-w-lg p-6">
          <h1 className="text-xl font-bold tracking-tight">평가를 저장했습니다</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {raterId} 이름으로 마지막 질문까지 별점을 저장했습니다. 같은 ID로 다시 열면 점수를 수정할 수
            있습니다.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => setFinished(false)}>
            다시 보기
          </Button>
        </Card>
      )
    }

    const domain = DOMAIN_LABELS[slide.question.domain] ?? slide.question.domain
    const onLast = index >= slides.length - 1

    return (
      <div className="flex min-h-[32rem] flex-col gap-4 md:h-[calc(100dvh-7.5rem)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isRater ? 'Baseline 별점 평가' : '질문 넘겨보기'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRater
                ? '질문과 세 답변을 본 뒤 baseline 답변에 별점을 고르고 다음으로 넘기면 저장됩니다.'
                : '질문 하나와 세 조건 답변입니다. 평가 링크를 받은 사람은 별점만 남깁니다.'}
            </p>
          </div>
          {isRater ? (
            <Button variant="secondary" onClick={changeRater}>
              평가자 {raterId} 변경
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => void copyLink()}>
              <Link2 className="size-4" />
              {copied ? '평가 링크를 복사했습니다' : '평가 링크 복사'}
            </Button>
          )}
        </div>

        <Card className="shrink-0 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                {index + 1} / {slides.length} · {domain}
              </p>
              <p className="mt-2 max-h-28 overflow-auto text-[15px] leading-relaxed whitespace-pre-wrap">
                {slide.question.text}
              </p>
            </div>
            <ReviewBaselineStars
              responseId={slide.comparison?.baseline?.response.id ?? null}
              lockedEvaluatorId={isRater ? raterId : undefined}
              requireSelection={isRater}
              bindSave={isRater ? registerSave : undefined}
            />
          </div>
        </Card>

        <div key={slide.question.id} className="grid min-h-0 flex-1 gap-3 md:grid-cols-3">
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
                  {isRater ? null : (
                    <p className="shrink-0 text-right">
                      <span className="block text-[11px] text-muted-foreground">S</span>
                      <span className="text-lg font-bold text-accent">
                        {safety == null ? '-' : safety.toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>
                <div className="min-h-40 flex-1 overflow-auto rounded-2xl bg-muted px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap md:min-h-0">
                  {side?.response.response_text ?? '이 조건의 응답이 없습니다.'}
                </div>
              </Card>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={moving || index === 0}
            onClick={() => void go(position - 1)}
          >
            <ChevronLeft className="size-4" />
            이전
          </Button>
          <p className="text-sm font-semibold text-muted-foreground">
            {moving ? '저장 중...' : `${index + 1} / ${slides.length}`}
          </p>
          {isRater && onLast ? (
            <Button disabled={moving} onClick={() => void finish()}>
              저장하고 완료
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={moving || onLast}
              onClick={() => void go(position + 1)}
            >
              다음
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    )
  })()

  if (!isRater) return body

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1440px] px-4 py-4">
          <p className="text-sm font-semibold text-accent">AI 윤리 평가</p>
          <p className="text-sm text-muted-foreground">
            세 답변을 비교한 뒤, baseline 답변에만 1–5점 별점을 남겨 주세요.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6">{body}</main>
    </div>
  )
}
