import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { getResultsCsvUrl } from '@/api/dashboard'
import { ScoreScaleLegend } from '@/components/common/ScoreScaleLegend'
import { ThreeConditionScoreBarChart } from '@/components/charts/ThreeConditionScoreBarChart'
import { WarningFrequencyChart } from '@/components/charts/WarningFrequencyChart'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ConditionSummaryCard } from '@/components/dashboard/ConditionSummaryCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ResearchInsightCard } from '@/components/dashboard/ResearchInsightCard'
import { PaperFiguresSection } from '@/components/results/PaperFiguresSection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDashboard } from '@/hooks/useDashboard'
import { useQuestionExperimentSummaries } from '@/hooks/useQuestionExperimentSummaries'
import { useQuestions } from '@/hooks/useQuestions'
import { CONDITION_META, CONDITIONS, normalizeCondition, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS, DOMAIN_OPTIONS } from '@/utils/constants'
import { buildDashboardInsights } from '@/utils/insights'
import { maxKeys, minKeys } from '@/utils/metrics'
import {
  buildConditionPaperStats,
  buildDomainDeltas,
  buildDomainSafetyRows,
  countBestConditions,
} from '@/utils/paperStats'

export function DashboardPage() {
  const { summary, conditions, loading, error, reload } = useDashboard()
  const { questions } = useQuestions()
  const { rows: questionRows, reload: reloadSummaries } = useQuestionExperimentSummaries(questions)

  const conditionMap = useMemo(() => {
    const map = new Map<Condition, (typeof conditions)[number]>()
    for (const item of conditions) {
      const key = normalizeCondition(item.condition)
      if (key) map.set(key, item)
    }
    return map
  }, [conditions])

  const insights = useMemo(() => {
    const hasData = conditions.some((c) => c.average_safety_score != null)
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
  }, [conditionMap, conditions])

  const baselineSafety = conditionMap.get('baseline')?.average_safety_score ?? null

  const analyzedQuestionRows = useMemo(
    () =>
      questionRows.filter(
        (row) =>
          row.baselineSafety != null || row.aiSafety != null || row.buddhistSafety != null,
      ),
    [questionRows],
  )

  const bestWins = useMemo(
    () =>
      countBestConditions(
        analyzedQuestionRows.map((row) => ({
          ...row,
          bestCondition: row.bestCondition ?? row.safestCondition,
        })),
      ),
    [analyzedQuestionRows],
  )

  const domainSafetyRows = useMemo(
    () =>
      buildDomainSafetyRows(
        analyzedQuestionRows,
        DOMAIN_OPTIONS.map((item) => item.value),
      ),
    [analyzedQuestionRows],
  )

  const paperConditionStats = useMemo(
    () => buildConditionPaperStats(analyzedQuestionRows),
    [analyzedQuestionRows],
  )

  const paperDomainDeltas = useMemo(
    () => buildDomainDeltas(domainSafetyRows, DOMAIN_LABELS),
    [domainSafetyRows],
  )

  const handleReload = () => {
    void Promise.all([reload(), reloadSummaries()])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            윤리 프롬프트 비교 연구 대시보드
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Baseline · AI 윤리 · AI 윤리 + 불교철학 응답의 안전성·책임성·자율성 비교
          </p>
          <ScoreScaleLegend className="mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/experiment">
            <Button>전체 실험 실행</Button>
          </Link>
          <a href={getResultsCsvUrl()} download>
            <Button type="button" variant="secondary">
              결과 CSV 다운로드
            </Button>
          </a>
          <Button variant="secondary" onClick={handleReload} disabled={loading}>
            새로고침
          </Button>
        </div>
      </div>

      {error ? <ErrorAlert message={error} /> : null}
      {loading && !summary ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner /> 대시보드 불러오는 중...
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="전체 질문 수" value={summary?.question_count ?? '-'} />
        <KpiCard label="전체 생성 응답 수" value={summary?.response_count ?? '-'} />
        <KpiCard
          label="Critical Mismatch"
          value={summary?.critical_mismatch_count ?? '-'}
          hint="낮은 C 점수와 불일치 경고"
        />
        <KpiCard
          label="인간 최종 평가 완료율"
          value={
            summary?.human_evaluation_rate != null
              ? `${summary.human_evaluation_rate}%`
              : '-'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {CONDITIONS.map((condition) => {
          const item = conditionMap.get(condition)
          const avg = item?.average_safety_score ?? null
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

      {analyzedQuestionRows.length > 0 ? (
        <PaperFiguresSection
          conditionStats={paperConditionStats}
          wins={bestWins}
          heatmapRows={domainSafetyRows}
          domainDeltas={paperDomainDeltas}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">조건별 평균 윤리 대응 점수 S</h2>
          <ThreeConditionScoreBarChart
            items={CONDITIONS.map((condition) => ({
              condition,
              score: conditionMap.get(condition)?.average_safety_score ?? null,
            }))}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">조건별 축 점수 비교</h2>
          <div className="space-y-3">
            {(
              [
                { key: 'E', label: '설명가능성 (E)' },
                { key: 'C', label: '위해예방 (C)' },
                { key: 'N', label: '비권위·자율 (N)' },
                { key: 'O7', label: '상황 대응 (O7)' },
              ] as const
            ).map((axis) => (
              <div key={axis.key}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{axis.label} 평균</p>
                <div className="grid grid-cols-3 gap-2">
                  {CONDITIONS.map((condition) => {
                    const item = conditionMap.get(condition)
                    const value =
                      axis.key === 'E'
                        ? item?.average_e_score
                        : axis.key === 'C'
                          ? item?.average_c_score
                          : axis.key === 'N'
                            ? item?.average_n_score
                            : item?.average_o7_score
                    return (
                      <div
                        key={condition}
                        className="rounded border px-2 py-1 text-center text-xs"
                        style={{ borderColor: CONDITION_META[condition].chartColor }}
                      >
                        <p>{CONDITION_META[condition].shortLabel}</p>
                        <p className="font-semibold">
                          {value == null ? '-' : value.toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">비교 기준</h2>
          <p className="text-sm text-muted-foreground">
            조건 비교는 설명가능성(E)·위해예방(C)·비권위·자율(N)·상황 대응(O7)·윤리 대응 점수
            S와 경고 빈도를 사용합니다.
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">고위험 경고 발생 빈도</h2>
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
    </div>
  )
}
