import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchResultsPayload, getResultsCsvUrl } from '@/api/dashboard'
import { ConditionAxisGroupedChart } from '@/components/charts/ConditionAxisGroupedChart'
import {
  DomainSafetyComparisonChart,
  QuestionSafetyStripChart,
} from '@/components/charts/DomainSafetyComparisonChart'
import { ThreeConditionScoreBarChart } from '@/components/charts/ThreeConditionScoreBarChart'
import { WarningFrequencyChart } from '@/components/charts/WarningFrequencyChart'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PageTitle } from '@/components/common/PageTitle'
import { ScoreScaleLegend } from '@/components/common/ScoreScaleLegend'
import { ConditionSummaryCard } from '@/components/dashboard/ConditionSummaryCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ResearchInsightCard } from '@/components/dashboard/ResearchInsightCard'
import { DomainGroupedQuestionList } from '@/components/results/DomainGroupedQuestionList'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useQuestionExperimentSummaries } from '@/hooks/useQuestionExperimentSummaries'
import { useQuestions } from '@/hooks/useQuestions'
import type { ResultsPayload } from '@/types/dashboard'
import { CONDITION_META, CONDITIONS, normalizeCondition, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS, DOMAIN_OPTIONS } from '@/utils/constants'
import { buildDashboardInsights } from '@/utils/insights'
import { maxKeys, minKeys } from '@/utils/metrics'
import { formatDelta, interpretDelta } from '@/utils/risk'
import { SimpleBarChart } from '@/components/charts/SimpleBarChart'
import { PaperFiguresSection } from '@/components/results/PaperFiguresSection'

export function ResultsPage() {
  const { questions, removeQuestion, reload: reloadQuestionList } = useQuestions()
  const [data, setData] = useState<ResultsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [domainFilter, setDomainFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    rows: questionRows,
    loading: questionLoading,
    error: questionError,
    reload: reloadQuestions,
  } = useQuestionExperimentSummaries(questions)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchResultsPayload())
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 결과를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const reloadAll = async () => {
    await Promise.all([load(), reloadQuestionList(), reloadQuestions()])
  }

  const handleDeleteQuestion = async (questionId: number) => {
    setDeletingId(questionId)
    setActionError(null)
    try {
      await removeQuestion(questionId)
      await Promise.all([load(), reloadQuestions()])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '질문 삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const conditionMap = useMemo(() => {
    const map = new Map<Condition, ResultsPayload['condition_comparison'][number]>()
    for (const item of data?.condition_comparison ?? []) {
      const key = normalizeCondition(item.condition)
      if (key) map.set(key, item)
    }
    return map
  }, [data])

  const filteredQuestionRows = useMemo(() => {
    return questionRows.filter((row) => {
      if (domainFilter !== 'all' && row.domain !== domainFilter) return false
      if (sourceFilter === 'human' && row.evaluationSource !== 'human') return false
      if (sourceFilter === 'llm' && row.evaluationSource == null) return false
      return true
    })
  }, [questionRows, domainFilter, sourceFilter])

  /** 실제 조건 점수가 하나라도 있는 질문만 '분석됨'으로 간주 */
  const analyzedQuestionRows = useMemo(() => {
    return filteredQuestionRows.filter(
      (row) =>
        row.baselineSafety != null ||
        row.aiSafety != null ||
        row.buddhistSafety != null,
    )
  }, [filteredQuestionRows])

  const filteredManageQuestions = useMemo(() => {
    const summaryById = new Map(questionRows.map((r) => [r.questionId, r]))
    return questions.filter((q) => {
      if (domainFilter !== 'all' && q.domain !== domainFilter) return false
      const summary = summaryById.get(q.id)
      if (sourceFilter === 'human') return summary?.evaluationSource === 'human'
      if (sourceFilter === 'llm') return summary?.evaluationSource != null
      return true
    })
  }, [questions, questionRows, domainFilter, sourceFilter])

  const insights = useMemo(() => {
    const hasData = (data?.condition_comparison ?? []).some((c) => c.average_safety_score != null)
    const bestSafety = maxKeys(
      CONDITIONS.map((c) => ({
        key: c,
        value: conditionMap.get(c)?.average_safety_score,
      })),
    )[0] as Condition | undefined
    const bestHarm = maxKeys(
      CONDITIONS.map((c) => ({
        key: c,
        value: conditionMap.get(c)?.average_c_score,
      })),
    )[0] as Condition | undefined
    const bestAutonomy = maxKeys(
      CONDITIONS.map((c) => ({
        key: c,
        value: conditionMap.get(c)?.average_n_score,
      })),
    )[0] as Condition | undefined
    const lowestMismatch = minKeys(
      CONDITIONS.map((c) => ({
        key: c,
        value: conditionMap.get(c)?.critical_mismatch_warning_count,
      })),
    )[0] as Condition | undefined

    return buildDashboardInsights({
      hasData,
      bestSafetyCondition: bestSafety ?? null,
      bestHarmPrevention: bestHarm ?? null,
      bestAutonomy: bestAutonomy ?? null,
      lowestMismatch: lowestMismatch ?? null,
    })
  }, [conditionMap, data])

  const summary = data?.summary
  const baseline = conditionMap.get('baseline')
  const analyzedCount = analyzedQuestionRows.length
  const analyzedDomainCount = useMemo(
    () => new Set(analyzedQuestionRows.map((row) => row.domain)).size,
    [analyzedQuestionRows],
  )
  const bestWins = useMemo(() => {
    const counts: Record<Condition, number> = {
      baseline: 0,
      ai_ethics_guided: 0,
      ai_ethics_buddhist_guided: 0,
    }
    for (const row of analyzedQuestionRows) {
      const best = row.bestCondition ?? row.safestCondition
      if (best) counts[best] += 1
    }
    return counts
  }, [analyzedQuestionRows])

  const axisChartValues = useMemo(() => {
    const out = {} as Record<
      Condition,
      Partial<Record<'E' | 'C' | 'N' | 'O7', number | null>>
    >
    for (const condition of CONDITIONS) {
      const item = conditionMap.get(condition)
      out[condition] = {
        E: item?.average_e_score ?? null,
        C: item?.average_c_score ?? null,
        N: item?.average_n_score ?? null,
        O7: item?.average_o7_score ?? null,
      }
    }
    return out
  }, [conditionMap])

  const domainSafetyRows = useMemo(() => {
    const byDomain = new Map<
      string,
      { baseline: number[]; ai: number[]; buddhist: number[] }
    >()
    for (const row of analyzedQuestionRows) {
      const bucket = byDomain.get(row.domain) ?? {
        baseline: [],
        ai: [],
        buddhist: [],
      }
      if (row.baselineSafety != null) bucket.baseline.push(row.baselineSafety)
      if (row.aiSafety != null) bucket.ai.push(row.aiSafety)
      if (row.buddhistSafety != null) bucket.buddhist.push(row.buddhistSafety)
      byDomain.set(row.domain, bucket)
    }
    const avg = (xs: number[]) =>
      xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100

    return DOMAIN_OPTIONS.map((d) => d.value)
      .filter((domain) => byDomain.has(domain))
      .map((domain) => {
        const bucket = byDomain.get(domain)!
        return {
          domain,
          baseline: avg(bucket.baseline),
          ai: avg(bucket.ai),
          buddhist: avg(bucket.buddhist),
        }
      })
  }, [analyzedQuestionRows])

  const questionStripRows = useMemo(
    () =>
      analyzedQuestionRows.map((row) => ({
        questionId: row.questionId,
        label: row.questionText,
        baseline: row.baselineSafety,
        ai: row.aiSafety,
        buddhist: row.buddhistSafety,
      })),
    [analyzedQuestionRows],
  )

  const deltaBarItems = useMemo(() => {
    const base = baseline?.average_safety_score
    return (['ai_ethics_guided', 'ai_ethics_buddhist_guided'] as Condition[])
      .map((condition) => {
        const avg = conditionMap.get(condition)?.average_safety_score
        const delta =
          base != null && avg != null ? Math.round((avg - base) * 100) / 100 : null
        return {
          label: CONDITION_META[condition].shortLabel,
          value: delta ?? 0,
          color: CONDITION_META[condition].chartColor,
          missing: delta == null,
        }
      })
      .filter((item) => !item.missing)
  }, [baseline, conditionMap])

  const paperConditionStats = useMemo(() => {
    const values: Record<Condition, number[]> = {
      baseline: [],
      ai_ethics_guided: [],
      ai_ethics_buddhist_guided: [],
    }
    for (const row of analyzedQuestionRows) {
      if (row.baselineSafety != null) values.baseline.push(row.baselineSafety)
      if (row.aiSafety != null) values.ai_ethics_guided.push(row.aiSafety)
      if (row.buddhistSafety != null) values.ai_ethics_buddhist_guided.push(row.buddhistSafety)
    }
    const meanSd = (xs: number[]) => {
      if (xs.length === 0) return { mean: null as number | null, sd: null as number | null, n: 0 }
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length
      const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length
      return {
        mean: Math.round(mean * 100) / 100,
        sd: Math.round(Math.sqrt(variance) * 100) / 100,
        n: xs.length,
      }
    }
    const baselineMean = meanSd(values.baseline).mean
    return CONDITIONS.map((condition) => {
      const stats = meanSd(values[condition])
      const deltaVsBaseline =
        condition === 'baseline' || baselineMean == null || stats.mean == null
          ? null
          : Math.round((stats.mean - baselineMean) * 100) / 100
      return {
        condition,
        mean: stats.mean,
        sd: stats.sd,
        n: stats.n,
        deltaVsBaseline,
      }
    })
  }, [analyzedQuestionRows])

  const paperDomainDeltas = useMemo(
    () =>
      domainSafetyRows.map((row) => ({
        domain: row.domain,
        label: DOMAIN_LABELS[row.domain] ?? row.domain,
        deltaAi:
          row.baseline != null && row.ai != null
            ? Math.round((row.ai - row.baseline) * 100) / 100
            : null,
        deltaBuddhist:
          row.baseline != null && row.buddhist != null
            ? Math.round((row.buddhist - row.baseline) * 100) / 100
            : null,
      })),
    [domainSafetyRows],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle
            title="전체 분석"
            description="논문용 그래프·표와 함께 Baseline · AI 윤리 · AI 윤리+불교 실험 결과를 비교합니다."
          />
          <ScoreScaleLegend className="mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/ethics-workspace">
            <Button>윤리 분석으로</Button>
          </Link>
          <a href={getResultsCsvUrl()} download>
            <Button type="button" variant="secondary">
              CSV 다운로드
            </Button>
          </a>
          <Button
            variant="secondary"
            onClick={() => void reloadAll()}
            disabled={loading || questionLoading}
          >
            새로고침
          </Button>
        </div>
      </div>

      <Card className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">도메인</span>
          <Select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
            <option value="all">전체</option>
            {DOMAIN_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">평가 소스</span>
          <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="all">전체</option>
            <option value="human">인간 최종 평가</option>
            <option value="llm">LLM 예비 평가 포함</option>
          </Select>
        </label>
        <div className="flex items-end text-sm text-muted-foreground">
          필터 즉시 반영 · 질문 {filteredManageQuestions.length}건 · 실험 결과{' '}
          {analyzedCount}건
        </div>
      </Card>

      {error ? <ErrorAlert message={error} /> : null}
      {questionError ? <ErrorAlert message={questionError} /> : null}
      {actionError ? <ErrorAlert message={actionError} /> : null}
      {(loading || questionLoading) && !data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner /> 전체 분석 불러오는 중...
        </div>
      ) : null}

      {!loading && !data && questionRows.length === 0 ? (
        <EmptyState
          title="분석 데이터가 없습니다"
          description="질문을 선택한 뒤 3조건 비교 실험을 먼저 실행해 주세요."
          action={
            <Link to="/ethics-workspace">
              <Button>윤리 분석 시작</Button>
            </Link>
          }
        />
      ) : null}

      {data || questionRows.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="등록 질문 수" value={summary?.question_count ?? questions.length} />
            <KpiCard
              label="분석된 질문 수"
              value={analyzedCount}
              hint="조건 점수가 산출된 질문"
            />
            <KpiCard label="생성 응답 수" value={summary?.response_count ?? '-'} />
            <KpiCard
              label="분석된 도메인 수"
              value={analyzedDomainCount}
              hint="점수가 있는 질문이 속한 도메인"
            />
            <KpiCard
              label="Critical Mismatch"
              value={summary?.critical_mismatch_count ?? '-'}
            />
            <KpiCard
              label="인간 평가 완료율"
              value={
                summary?.human_evaluation_rate != null
                  ? `${summary.human_evaluation_rate}%`
                  : '-'
              }
            />
          </div>

          <PaperFiguresSection
            conditionStats={paperConditionStats}
            wins={bestWins}
            heatmapRows={domainSafetyRows}
            domainDeltas={paperDomainDeltas}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-lg font-semibold">조건별 평균 윤리 대응 점수 S</h2>
              <p className="mb-3 text-xs text-muted-foreground">1~5 · 높을수록 좋음</p>
              <ThreeConditionScoreBarChart
                items={CONDITIONS.map((condition) => ({
                  condition,
                  score: conditionMap.get(condition)?.average_safety_score ?? null,
                }))}
              />
            </Card>
            <Card>
              <h2 className="mb-1 text-lg font-semibold">축 점수 비교 (E / C / N / O7)</h2>
              <p className="mb-3 text-xs text-muted-foreground">조건별 평균 축 점수</p>
              <ConditionAxisGroupedChart values={axisChartValues} />
            </Card>
            <Card>
              <h2 className="mb-1 text-lg font-semibold">도메인별 평균 S</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                현재 필터의 분석된 질문 기준
              </p>
              <DomainSafetyComparisonChart rows={domainSafetyRows} />
            </Card>
            <Card>
              <h2 className="mb-1 text-lg font-semibold">질문별 S 분포</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                점 = 조건별 점수 위치 (왼쪽 1 · 오른쪽 5)
              </p>
              <QuestionSafetyStripChart rows={questionStripRows} />
            </Card>
            <Card>
              <h2 className="mb-1 text-lg font-semibold">질문별 최고 점수 조건</h2>
              <p className="mb-3 text-xs text-muted-foreground">S가 가장 높았던 횟수</p>
              <SimpleBarChart
                maxValue={Math.max(1, ...CONDITIONS.map((c) => bestWins[c]))}
                items={CONDITIONS.map((condition) => ({
                  label: CONDITION_META[condition].shortLabel,
                  value: bestWins[condition],
                  color: CONDITION_META[condition].chartColor,
                }))}
              />
            </Card>
            <Card>
              <h2 className="mb-1 text-lg font-semibold">Baseline 대비 ΔS</h2>
              <p className="mb-3 text-xs text-muted-foreground">양수면 Baseline보다 향상</p>
              {deltaBarItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  비교할 조건 평균이 아직 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {deltaBarItems.map((item) => {
                    const width = Math.min(100, Math.abs(item.value) * 40)
                    return (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span
                            className={
                              item.value > 0
                                ? 'font-medium text-green-700'
                                : item.value < 0
                                  ? 'font-medium text-red-700'
                                  : 'font-medium text-slate-600'
                            }
                          >
                            {item.value > 0 ? '+' : ''}
                            {item.value.toFixed(2)}
                          </span>
                        </div>
                        <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
                          <div
                            className="absolute top-0 h-full rounded-full"
                            style={{
                              width: `${width}%`,
                              left: item.value >= 0 ? '50%' : `calc(50% - ${width}%)`,
                              backgroundColor: item.color,
                              opacity: 0.85,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
            <Card className="lg:col-span-2">
              <h2 className="mb-1 text-lg font-semibold">경고 빈도</h2>
              <p className="mb-3 text-xs text-muted-foreground">조건별 고위험·Critical Mismatch</p>
              <WarningFrequencyChart
                items={CONDITIONS.map((condition) => ({
                  condition,
                  highRisk: conditionMap.get(condition)?.high_risk_warning_count ?? 0,
                  criticalMismatch:
                    conditionMap.get(condition)?.critical_mismatch_warning_count ?? 0,
                }))}
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {CONDITIONS.map((condition) => {
              const item = conditionMap.get(condition)
              const avg = item?.average_safety_score ?? null
              const baselineSafety = baseline?.average_safety_score ?? null
              const delta =
                condition === 'baseline' || baselineSafety == null || avg == null
                  ? null
                  : Math.round((avg - baselineSafety) * 100) / 100
              return (
                <ConditionSummaryCard
                  key={condition}
                  condition={condition}
                  averageSafety={avg}
                  averageO7={item?.average_o7_score ?? null}
                  averageE={item?.average_e_score ?? null}
                  averageC={item?.average_c_score ?? null}
                  averageN={item?.average_n_score ?? null}
                  highRiskWarnings={item?.high_risk_warning_count ?? 0}
                  deltaVsBaseline={delta}
                />
              )
            })}
          </div>

          <ResearchInsightCard insights={insights} />

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">도메인별 질문 관리</h2>
                <p className="text-sm text-muted-foreground">
                  도메인을 펼쳐 질문을 확인하세요. 「보기」로 워크스페이스로 이동하고, 「삭제」로
                  질문을 제거할 수 있습니다. 실험 결과가 있으면 행을 클릭해 요약도 펼칩니다.
                </p>
              </div>
              {questionLoading ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <LoadingSpinner /> 질문·결과 동기화 중
                </span>
              ) : null}
            </div>
            <DomainGroupedQuestionList
              questions={filteredManageQuestions}
              summaries={filteredQuestionRows}
              onDelete={handleDeleteQuestion}
              deletingId={deletingId}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-lg font-semibold">전체 결과 요약 표</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">조건</th>
                      <th className="px-3 py-2">응답 수</th>
                      <th className="px-3 py-2">평균 S</th>
                      <th className="px-3 py-2">설명가능성 (E)</th>
                      <th className="px-3 py-2">위해예방 (C)</th>
                      <th className="px-3 py-2">비권위·자율 (N)</th>
                      <th className="px-3 py-2">상황 대응 (O7)</th>
                      <th className="px-3 py-2">고위험 경고</th>
                      <th className="px-3 py-2">Critical Mismatch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONDITIONS.map((condition) => {
                      const row = conditionMap.get(condition)
                      return (
                        <tr key={condition} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">
                            {CONDITION_META[condition].label}
                          </td>
                          <td className="px-3 py-2">{row?.count ?? 0}</td>
                          <td className="px-3 py-2">{fmt(row?.average_safety_score)}</td>
                          <td className="px-3 py-2">{fmt(row?.average_e_score)}</td>
                          <td className="px-3 py-2">{fmt(row?.average_c_score)}</td>
                          <td className="px-3 py-2">{fmt(row?.average_n_score)}</td>
                          <td className="px-3 py-2">{fmt(row?.average_o7_score)}</td>
                          <td className="px-3 py-2">{row?.high_risk_warning_count ?? 0}</td>
                          <td className="px-3 py-2">
                            {row?.critical_mismatch_warning_count ?? 0}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-lg font-semibold">Baseline 대비 개선량</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">조건</th>
                      <th className="px-3 py-2">ΔS</th>
                      {(data?.rubric_comparison ?? []).map((r) => (
                        <th key={r.key} className="px-3 py-2">
                          {r.key} 변화
                        </th>
                      ))}
                      <th className="px-3 py-2">해석</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['ai_ethics_guided', 'ai_ethics_buddhist_guided'] as Condition[]).map(
                      (condition) => {
                        const row = conditionMap.get(condition)
                        const deltaS =
                          baseline?.average_safety_score != null &&
                          row?.average_safety_score != null
                            ? Math.round(
                                (row.average_safety_score - baseline.average_safety_score) * 100,
                              ) / 100
                            : null
                        const interp = interpretDelta(deltaS)
                        return (
                          <tr key={condition} className="border-t border-border">
                            <td className="px-3 py-2 font-medium">
                              {CONDITION_META[condition].label}
                            </td>
                            <td className={`px-3 py-2 ${interp.className}`}>
                              {formatDelta(deltaS)}
                            </td>
                            {(data?.rubric_comparison ?? []).map((rubric) => {
                              const treatment =
                                condition === 'ai_ethics_guided'
                                  ? rubric.ai_ethics_guided_average
                                  : rubric.ai_ethics_buddhist_guided_average ??
                                    rubric.buddhist_guided_average
                              const d =
                                rubric.baseline_average != null && treatment != null
                                  ? Math.round((treatment - rubric.baseline_average) * 100) / 100
                                  : null
                              return (
                                <td key={rubric.key} className="px-3 py-2">
                                  {fmt(d)}
                                </td>
                              )
                            })}
                            <td className={`px-3 py-2 ${interp.className}`}>{interp.label}</td>
                          </tr>
                        )
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}

function fmt(value: number | null | undefined): string {
  return value == null ? '-' : value.toFixed(2)
}
