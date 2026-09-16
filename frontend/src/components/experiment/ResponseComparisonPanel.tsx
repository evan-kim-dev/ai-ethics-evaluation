import { useMemo, useState } from 'react'

import { ThreeConditionScoreBarChart } from '@/components/charts/ThreeConditionScoreBarChart'
import { ThreeConditionResponseComparison } from '@/components/experiment/ThreeConditionResponseComparison'
import { BuddhistAxesPanel } from '@/components/experiment/BuddhistAxesPanel'
import { RubricComparisonTable } from '@/components/experiment/RubricComparisonTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import type { QuestionExperimentSummary } from '@/hooks/useQuestionExperimentSummaries'
import type { ThreeConditionExperimentView } from '@/types/comparison'
import { adaptExperimentComparison } from '@/api/adapters/experimentAdapter'
import type { Question } from '@/types/question'
import { CONDITION_META, CONDITIONS, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS, DOMAIN_OPTIONS } from '@/utils/constants'
import { cn } from '@/lib/utils'

export type ResponseCompareScope = 'question' | 'domain' | 'all'

function avg(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}

function viewFromSummary(
  summary: QuestionExperimentSummary,
  question: Question | undefined,
): ThreeConditionExperimentView | null {
  if (!question) return null
  return adaptExperimentComparison(summary.comparison, question)
}

export function ResponseComparisonPanel({
  scope,
  onScopeChange,
  domain,
  onDomainChange,
  selectedQuestion,
  view,
  summaries,
  questions,
  loadingSummaries,
  onGoCommentary,
  onSelectQuestion,
}: {
  scope: ResponseCompareScope
  onScopeChange: (scope: ResponseCompareScope) => void
  domain: string
  onDomainChange: (domain: string) => void
  selectedQuestion: Question | null
  view: ThreeConditionExperimentView | null
  summaries: QuestionExperimentSummary[]
  questions: Question[]
  loadingSummaries: boolean
  onGoCommentary: () => void
  onSelectQuestion: (questionId: number) => void
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const questionMap = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions],
  )

  const scopedSummaries = useMemo(() => {
    if (scope === 'question') return []
    if (scope === 'domain') {
      return summaries.filter((row) => row.domain === domain)
    }
    return summaries
  }, [summaries, scope, domain])

  const aggregateScores = useMemo(() => {
    return CONDITIONS.map((condition) => {
      const scores = scopedSummaries.map((row) => {
        if (condition === 'baseline') return row.baselineSafety
        if (condition === 'ai_ethics_guided') return row.aiSafety
        return row.buddhistSafety
      })
      return { condition, score: avg(scores) }
    })
  }, [scopedSummaries])

  const winCounts = useMemo(() => {
    const counts: Record<Condition, number> = {
      baseline: 0,
      ai_ethics_guided: 0,
      ai_ethics_buddhist_guided: 0,
    }
    for (const row of scopedSummaries) {
      const best = row.bestCondition ?? row.safestCondition
      if (best) counts[best] += 1
    }
    return counts
  }, [scopedSummaries])

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">응답 비교 범위</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              저장된 실험 결과를 불러와 비교합니다. 실행한 데이터는 DB에 남습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'question', label: '개별 질문' },
                { key: 'domain', label: '개별 도메인' },
                { key: 'all', label: '전체 도메인' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onScopeChange(item.key)}
                className={cn(
                  'rounded-2xl px-3 py-1.5 text-sm font-medium transition active:scale-[0.98]',
                  scope === item.key
                    ? 'bg-accent/10 text-accent ring-1 ring-accent/25'
                    : 'bg-muted text-foreground hover:bg-accent/10 hover:text-accent',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {scope === 'domain' ? (
          <label className="block max-w-xs text-sm">
            <span className="mb-1 block text-muted-foreground">도메인</span>
            <Select value={domain} onChange={(e) => onDomainChange(e.target.value)}>
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        {scope === 'question' && selectedQuestion ? (
          <p className="text-sm text-muted-foreground">
            현재 질문 #{selectedQuestion.id} ·{' '}
            {DOMAIN_LABELS[selectedQuestion.domain] ?? selectedQuestion.domain}
            {view ? ' · 저장된 결과 표시 중' : ' · 아직 저장된 실험 없음'}
          </p>
        ) : null}

        {scope !== 'question' ? (
          <p className="text-sm text-muted-foreground">
            {scope === 'domain'
              ? `${DOMAIN_LABELS[domain] ?? domain} 도메인`
              : '전체 도메인'}{' '}
            · 분석된 질문 {scopedSummaries.length}건
          </p>
        ) : null}
      </Card>

      {scope === 'question' ? (
        view ? (
          <div className="space-y-4">
            <ThreeConditionResponseComparison
              results={CONDITIONS.map((c) => view.results.find((r) => r.condition === c)).filter(
                Boolean,
              ) as typeof view.results}
              onGoCommentary={onGoCommentary}
            />
            <Card>
              <h3 className="mb-3 text-base font-semibold">윤리 평가 기준 비교 (항목별 차이)</h3>
              <RubricComparisonTable results={view.results} />
            </Card>
            <BuddhistAxesPanel results={view.results} />
          </div>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">
              이 질문에 저장된 실험 결과가 없습니다. 목록에서 「실행」을 눌러 결과를 생성·저장하세요.
            </p>
          </Card>
        )
      ) : loadingSummaries ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner /> 저장된 실험 불러오는 중...
        </div>
      ) : scopedSummaries.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            이 범위에 저장된 실험 결과가 없습니다. 질문을 실행하면 여기에 누적됩니다.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-base font-semibold">범위 평균 윤리 대응 점수 S</h3>
              <ThreeConditionScoreBarChart items={aggregateScores} />
            </Card>
            <Card>
              <h3 className="mb-3 text-base font-semibold">질문별 최고 점수 조건</h3>
              <div className="grid grid-cols-3 gap-2">
                {CONDITIONS.map((condition) => (
                  <div
                    key={condition}
                    className="rounded-lg border px-3 py-3 text-center"
                    style={{ borderColor: CONDITION_META[condition].chartColor }}
                  >
                    <p className="text-xs text-muted-foreground">
                      {CONDITION_META[condition].shortLabel}
                    </p>
                    <p
                      className="mt-1 text-2xl font-bold"
                      style={{ color: CONDITION_META[condition].chartColor }}
                    >
                      {winCounts[condition]}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="space-y-3">
            <h3 className="text-base font-semibold">질문별 3조건 응답 비교</h3>
            <p className="text-xs text-muted-foreground">
              행을 펼치면 저장된 Baseline / AI 윤리 / 윤리+불교 응답을 볼 수 있습니다.
            </p>
            <div className="space-y-2">
              {scopedSummaries.map((row) => {
                const open = expandedId === row.questionId
                const question = questionMap.get(row.questionId)
                const detail = open ? viewFromSummary(row, question) : null
                return (
                  <div
                    key={row.questionId}
                    className="overflow-hidden rounded-lg border border-border bg-white"
                  >
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60"
                      onClick={() => {
                        setExpandedId(open ? null : row.questionId)
                        onSelectQuestion(row.questionId)
                      }}
                    >
                      <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                        #{row.questionId}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{row.questionText}</span>
                      <span className="text-xs text-muted-foreground">
                        {DOMAIN_LABELS[row.domain] ?? row.domain}
                      </span>
                      <span className="flex gap-2 text-xs tabular-nums">
                        <span style={{ color: CONDITION_META.baseline.chartColor }}>
                          B {row.baselineSafety?.toFixed(2) ?? '-'}
                        </span>
                        <span style={{ color: CONDITION_META.ai_ethics_guided.chartColor }}>
                          A {row.aiSafety?.toFixed(2) ?? '-'}
                        </span>
                        <span
                          style={{
                            color: CONDITION_META.ai_ethics_buddhist_guided.chartColor,
                          }}
                        >
                          + {row.buddhistSafety?.toFixed(2) ?? '-'}
                        </span>
                      </span>
                    </button>
                    {open && detail ? (
                      <div className="space-y-3 border-t border-border bg-slate-50/80 p-3">
                        <ThreeConditionResponseComparison
                          results={CONDITIONS.map((c) =>
                            detail.results.find((r) => r.condition === c),
                          ).filter(Boolean) as typeof detail.results}
                          onGoCommentary={onGoCommentary}
                        />
                        <Button
                          variant="secondary"
                          className="w-full sm:w-auto"
                          onClick={() => onSelectQuestion(row.questionId)}
                        >
                          이 질문을 워크스페이스에서 선택
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
