import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { adaptExperimentComparison } from '@/api/adapters/experimentAdapter'
import { loadCommentary } from '@/api/commentaryApi'
import {
  fetchLatestExperimentForQuestion,
  runQuestionExperiment,
} from '@/api/experiments'
import { ThreeConditionRadarChart } from '@/components/charts/ThreeConditionRadarChart'
import { ThreeConditionScoreBarChart } from '@/components/charts/ThreeConditionScoreBarChart'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ScoreScaleLegend } from '@/components/common/ScoreScaleLegend'
import { AiEthicsPrinciplesPanel } from '@/components/ethics/AiEthicsPrinciplesPanel'
import { BuddhistEthicsPanel } from '@/components/ethics/BuddhistEthicsPanel'
import { EthicalIssueOverview } from '@/components/ethics/EthicalIssueOverview'
import { HumanValuesPanel } from '@/components/ethics/HumanValuesPanel'
import { RequiredActionsChecklist } from '@/components/ethics/RequiredActionsChecklist'
import { ResearcherCommentaryForm } from '@/components/ethics/ResearcherCommentaryForm'
import {
  BatchRunProgressPanel,
  type BatchRunProgress,
} from '@/components/experiment/BatchRunProgressPanel'
import { EthicsAxisSummary } from '@/components/experiment/EthicsAxisSummary'
import { ExperimentConclusionPanel } from '@/components/experiment/ExperimentConclusionPanel'
import { RubricComparisonTable } from '@/components/experiment/RubricComparisonTable'
import { BuddhistAxesPanel } from '@/components/experiment/BuddhistAxesPanel'
import {
  ResponseComparisonPanel,
  type ResponseCompareScope,
} from '@/components/experiment/ResponseComparisonPanel'
import { WarningAnalysisPanel } from '@/components/experiment/WarningAnalysisPanel'
import { DomainQuestionPicker } from '@/components/questions/DomainQuestionPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useQuestionExperimentSummaries } from '@/hooks/useQuestionExperimentSummaries'
import { useQuestions } from '@/hooks/useQuestions'
import { EMPTY_COMMENTARY, type ResearcherEthicalCommentary } from '@/types/commentary'
import type { ThreeConditionExperimentView } from '@/types/comparison'
import { CONDITIONS } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'

type TabKey = 'issues' | 'responses' | 'scores' | 'commentary'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'issues', label: '윤리 쟁점' },
  { key: 'responses', label: '응답 비교' },
  { key: 'scores', label: '평가 결과' },
  { key: 'commentary', label: '연구자 해설' },
]

export function EthicsWorkspacePage() {
  const { questions, loading: questionsLoading, error: questionsError } = useQuestions()
  const {
    rows: experimentSummaries,
    loading: summariesLoading,
    reload: reloadSummaries,
  } = useQuestionExperimentSummaries(questions)
  const [searchParams, setSearchParams] = useSearchParams()
  const [questionId, setQuestionId] = useState<number | ''>('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ThreeConditionExperimentView | null>(null)
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [tab, setTab] = useState<TabKey>('issues')
  const [compareScope, setCompareScope] = useState<ResponseCompareScope>('question')
  const [compareDomain, setCompareDomain] = useState('general')
  const [commentary, setCommentary] = useState<ResearcherEthicalCommentary | null>(null)
  const [batchProgress, setBatchProgress] = useState<BatchRunProgress | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [singleRunning, setSingleRunning] = useState(false)

  useEffect(() => {
    const q = searchParams.get('questionId')
    if (q && Number.isFinite(Number(q))) setQuestionId(Number(q))
  }, [searchParams])

  useEffect(() => {
    if (questions.length > 0 && questionId === '') setQuestionId(questions[0].id)
  }, [questions, questionId])

  useEffect(() => {
    if (!running) {
      setElapsedSec(0)
      return
    }
    const started = Date.now()
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [running])

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === questionId) ?? null,
    [questions, questionId],
  )

  // 질문 변경 시 저장된 최신 실험 결과를 DB에서 불러온다
  useEffect(() => {
    if (!selectedQuestion || running) return
    let cancelled = false
    const needsLoad = view?.questionId !== selectedQuestion.id
    if (needsLoad) setLoadingSaved(true)
    void fetchLatestExperimentForQuestion(selectedQuestion.id)
      .then((raw) => {
        if (cancelled) return
        if (!raw) {
          if (needsLoad) setView(null)
          return
        }
        setView(adaptExperimentComparison(raw, selectedQuestion))
      })
      .catch(() => {
        if (!cancelled && needsLoad) setView(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingSaved(false)
      })
    return () => {
      cancelled = true
    }
    // view는 의도적으로 deps에서 제외 — 실행 직후 결과 유지, 질문 전환 시에만 로드
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestion, running])

  useEffect(() => {
    if (!selectedQuestion) return
    void loadCommentary(selectedQuestion.id, view?.experimentId).then((c) => {
      setCommentary(c ?? EMPTY_COMMENTARY(selectedQuestion.id, view?.experimentId))
    })
  }, [selectedQuestion, view?.experimentId])

  useEffect(() => {
    if (selectedQuestion?.domain) setCompareDomain(selectedQuestion.domain)
  }, [selectedQuestion?.domain])

  const selectQuestion = (id: number) => {
    setQuestionId(id)
    setSearchParams({ questionId: String(id) })
  }

  const handleRunOne = async (id: number = questionId === '' ? -1 : questionId) => {
    const question = questions.find((q) => q.id === id)
    if (!question) {
      setError('질문을 선택해주세요.')
      return
    }
    setRunning(true)
    setSingleRunning(true)
    setError(null)
    try {
      const raw = await runQuestionExperiment(id, { run_llm_judge: true })
      setQuestionId(id)
      setView(adaptExperimentComparison(raw, question))
      setSearchParams({ questionId: String(id) })
      setTab('responses')
      setCompareScope('question')
      await reloadSummaries()
    } catch (err) {
      setError(err instanceof Error ? err.message : '비교 실험 실행에 실패했습니다.')
    } finally {
      setRunning(false)
      setSingleRunning(false)
    }
  }

  const handleBatchRun = async (ids: number[], label: string) => {
    if (ids.length === 0) return
    if (
      !window.confirm(
        `${label} ${ids.length}개 질문에 대해 3조건 비교 실험을 순서대로 실행할까요?\n시간이 꽤 걸릴 수 있습니다.`,
      )
    ) {
      return
    }

    setRunning(true)
    setSingleRunning(false)
    setError(null)
    setBatchProgress({
      current: 0,
      total: ids.length,
      label,
      phase: 'running',
      successCount: 0,
      failCount: 0,
    })
    const failures: string[] = []
    let successCount = 0
    let lastOkId: number | null = null

    try {
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i]
        const question = questions.find((q) => q.id === id)
        setBatchProgress({
          current: i,
          total: ids.length,
          label,
          questionId: id,
          questionPreview: question?.text,
          phase: 'running',
          successCount,
          failCount: failures.length,
        })
        if (!question) {
          failures.push(`Q#${id}: 질문을 찾을 수 없음`)
          setBatchProgress({
            current: i + 1,
            total: ids.length,
            label,
            questionId: id,
            phase: 'running',
            successCount,
            failCount: failures.length,
          })
          continue
        }
        try {
          const raw = await runQuestionExperiment(id, { run_llm_judge: true })
          lastOkId = id
          successCount += 1
          setQuestionId(id)
          setView(adaptExperimentComparison(raw, question))
          setSearchParams({ questionId: String(id) })
        } catch (err) {
          failures.push(`Q#${id}: ${err instanceof Error ? err.message : '실행 실패'}`)
        }
        setBatchProgress({
          current: i + 1,
          total: ids.length,
          label,
          questionId: id,
          questionPreview: question.text,
          phase: 'running',
          successCount,
          failCount: failures.length,
        })
      }

      if (lastOkId != null) {
        setTab('responses')
        if (label === '전체 질문') setCompareScope('all')
        else if (ids.length > 1) setCompareScope('domain')
        else setCompareScope('question')
        const lastQ = questions.find((q) => q.id === lastOkId)
        if (lastQ?.domain) setCompareDomain(lastQ.domain)
      }
      setBatchProgress({
        current: ids.length,
        total: ids.length,
        label,
        phase: 'done',
        successCount,
        failCount: failures.length,
      })
      if (failures.length > 0) {
        setError(
          `일괄 실행 완료 · 성공 ${successCount}/${ids.length}\n` +
            failures.slice(0, 5).join('\n') +
            (failures.length > 5 ? `\n…외 ${failures.length - 5}건` : ''),
        )
      }
      await reloadSummaries()
      await new Promise((resolve) => window.setTimeout(resolve, 1800))
    } finally {
      setRunning(false)
      setBatchProgress(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.65rem] font-bold tracking-tight text-foreground sm:text-[1.85rem]">
          윤리 응답 분석 워크스페이스
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          도메인별로 질문을 고르거나, 전체·도메인 단위로 3조건 비교 실험을 일괄 실행할 수
          있습니다.
        </p>
        <ScoreScaleLegend className="mt-2" />
      </div>

      {questionsError ? <ErrorAlert message={questionsError} /> : null}
      {error ? (
        <ErrorAlert message={error} />
      ) : null}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">질문 선택 (도메인별)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              각 질문의 실행 버튼으로 개별 실험을 돌리거나, 전체·도메인 일괄 실행을 사용할 수
              있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={running || questions.length === 0}
              onClick={() =>
                void handleBatchRun(
                  questions.map((q) => q.id),
                  '전체 질문',
                )
              }
            >
              {batchProgress && batchProgress.phase !== 'done' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  일괄 실행 중… {batchProgress.current}/{batchProgress.total}
                </>
              ) : (
                '전체 질문 실행'
              )}
            </Button>
            <Button
              variant="secondary"
              disabled={!selectedQuestion || running}
              onClick={() => void handleRunOne()}
            >
              결과 새로고침
            </Button>
          </div>
        </div>

        {batchProgress ? (
          <BatchRunProgressPanel progress={batchProgress} elapsedSec={elapsedSec} />
        ) : null}

        {singleRunning ? (
          <div
            className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={18} className="shrink-0 animate-spin text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">선택 질문 3조건 실험 실행 중</p>
              <p className="mt-0.5 text-xs text-blue-800/80">
                응답 생성 → LLM 평가 진행 · 경과 {elapsedSec}초
              </p>
            </div>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500" />
            </div>
          </div>
        ) : null}

        {questionsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner /> 질문 불러오는 중...
          </div>
        ) : (
          <DomainQuestionPicker
            questions={questions}
            value={questionId}
            onChange={selectQuestion}
            disabled={running}
            runningQuestionId={singleRunning && questionId !== '' ? questionId : null}
            onRunQuestion={(id) => void handleRunOne(id)}
            onRunDomain={(domain, ids) =>
              void handleBatchRun(ids, DOMAIN_LABELS[domain] ?? domain)
            }
          />
        )}
      </Card>

      <div className="flex flex-wrap gap-1 rounded-[22px] bg-muted p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-2xl px-3.5 py-2 text-sm font-semibold tracking-tight transition active:scale-[0.98] ${
              tab === t.key
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent/10 hover:text-accent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadingSaved && tab !== 'issues' && tab !== 'responses' ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner /> 저장된 실험 불러오는 중...
        </div>
      ) : null}

      {!view && !loadingSaved && tab !== 'issues' && tab !== 'responses' ? (
        <EmptyState
          title="실험 결과가 필요합니다"
          description="질문을 선택한 뒤 3조건 비교 실험을 실행하세요. 윤리 쟁점·응답 비교 탭은 저장된 결과로도 확인할 수 있습니다."
          action={
            <Button onClick={() => void handleRunOne()} disabled={running || questionId === ''}>
              비교 실험 실행하기
            </Button>
          }
        />
      ) : null}

      {tab === 'issues' && selectedQuestion && view ? (
        <div className="space-y-4">
          <EthicalIssueOverview input={view.input} />
          <HumanValuesPanel domain={view.input.domain} />
          <AiEthicsPrinciplesPanel />
          <BuddhistEthicsPanel />
          <RequiredActionsChecklist actions={view.input.required_actions} />
        </div>
      ) : null}

      {tab === 'issues' && selectedQuestion && !view ? (
        <div className="space-y-4">
          <EthicalIssueOverview
            input={{
              questionId: selectedQuestion.id,
              text: selectedQuestion.text,
              domain: selectedQuestion.domain,
              risk_level: selectedQuestion.risk_level,
              I1_domain_risk: ['medical', 'mental_health'].includes(selectedQuestion.domain)
                ? 3
                : ['legal', 'finance'].includes(selectedQuestion.domain)
                  ? 2
                  : ['employment_education'].includes(selectedQuestion.domain)
                    ? 1
                    : 0,
              I2_harm_potential: ['medical', 'mental_health'].includes(selectedQuestion.domain)
                ? 3
                : ['legal', 'finance'].includes(selectedQuestion.domain)
                  ? 2
                  : ['employment_education'].includes(selectedQuestion.domain)
                    ? 1
                    : 0,
              I3_vulnerability_urgency: ['medical', 'mental_health', 'legal', 'finance'].includes(
                selectedQuestion.domain,
              )
                ? 2
                : 1,
              I4_ai_dependence_risk: ['medical', 'mental_health', 'legal', 'finance'].includes(
                selectedQuestion.domain,
              )
                ? 2
                : 1,
              required_actions: selectedQuestion.expected_safety_action
                ? selectedQuestion.expected_safety_action.split(/[\n,;/]+/).map((s) => s.trim()).filter(Boolean)
                : [],
              inferred: true,
            }}
          />
          <HumanValuesPanel domain={selectedQuestion.domain} />
          <AiEthicsPrinciplesPanel />
          <BuddhistEthicsPanel />
          <RequiredActionsChecklist
            actions={
              selectedQuestion.expected_safety_action
                ? selectedQuestion.expected_safety_action
                    .split(/[\n,;/]+/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []
            }
          />
        </div>
      ) : null}

      {tab === 'responses' ? (
        loadingSaved && compareScope === 'question' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner /> 저장된 실험 불러오는 중...
          </div>
        ) : (
          <ResponseComparisonPanel
            scope={compareScope}
            onScopeChange={setCompareScope}
            domain={compareDomain}
            onDomainChange={setCompareDomain}
            selectedQuestion={selectedQuestion}
            view={view}
            summaries={experimentSummaries}
            questions={questions}
            loadingSummaries={summariesLoading}
            onGoCommentary={() => setTab('commentary')}
            onSelectQuestion={selectQuestion}
          />
        )
      ) : null}

      {tab === 'scores' && view ? (
        <div className="space-y-4">
          <ExperimentConclusionPanel
            results={view.results}
            bestCondition={view.safestCondition}
          />
          <Card>
            <h3 className="mb-3 text-base font-semibold">윤리 평가 기준 비교 (1~5점)</h3>
            <RubricComparisonTable results={view.results} />
          </Card>
          <BuddhistAxesPanel results={view.results} />
          <EthicsAxisSummary results={view.results} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-base font-semibold">윤리 대응 점수 S 비교 (1~5)</h3>
              <ThreeConditionScoreBarChart
                items={CONDITIONS.map((condition) => {
                  const result = view.results.find((r) => r.condition === condition)
                  return {
                    condition,
                    score: result?.risk_result?.overall_safety_score ?? null,
                  }
                })}
              />
            </Card>
            <Card>
              <h3 className="mb-3 text-base font-semibold">루브릭 레이더 (1~5)</h3>
              <ThreeConditionRadarChart results={view.results} />
            </Card>
          </div>
          <WarningAnalysisPanel results={view.results} />
        </div>
      ) : null}

      {tab === 'commentary' && selectedQuestion && commentary ? (
        <ResearcherCommentaryForm
          value={{
            ...commentary,
            questionId: selectedQuestion.id,
            experimentId: view?.experimentId,
          }}
          onChange={setCommentary}
        />
      ) : null}
    </div>
  )
}
