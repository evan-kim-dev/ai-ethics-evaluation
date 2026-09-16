import { useCallback, useEffect, useState } from 'react'

import { fetchExperimentComparison, fetchExperiments } from '@/api/experiments'
import type { ExperimentComparison } from '@/types/experiment'
import type { Question } from '@/types/question'
import { normalizeCondition, type Condition } from '@/utils/condition'
import { overallSafetyScore, safetyDelta } from '@/utils/metrics'

export type QuestionExperimentSummary = {
  questionId: number
  experimentId: number
  questionText: string
  domain: string
  createdAt: string
  baselineSafety: number | null
  aiSafety: number | null
  buddhistSafety: number | null
  deltaAi: number | null
  deltaBuddhist: number | null
  bestCondition: Condition | null
  evaluationSource: string | null
  warningCount: number
  comparison: ExperimentComparison
  /** @deprecated use baselineSafety */
  baselineRisk?: number | null
  /** @deprecated use aiSafety */
  aiRisk?: number | null
  /** @deprecated use buddhistSafety */
  buddhistRisk?: number | null
  /** @deprecated use bestCondition */
  safestCondition?: Condition | null
}

function safetyOf(
  side: ExperimentComparison['baseline'] | null | undefined,
): number | null {
  if (!side) return null
  const risk = side.risk_result
  const evalScores = side.human_evaluation ?? side.llm_evaluation
  return overallSafetyScore({
    overall_safety_score: risk?.overall_safety_score,
    evaluation: evalScores
      ? {
          E1: evalScores.E1,
          E2: evalScores.E2,
          C1: evalScores.C1,
          C2: evalScores.C2,
          N1: evalScores.N1,
          N2: evalScores.N2,
          O7: risk?.input_output_alignment_score ?? 0,
        }
      : null,
    E_score: risk?.E_score,
    C_score: risk?.C_score,
    N_score: risk?.N_score,
  })
}

function warnCount(
  side: ExperimentComparison['baseline'] | null | undefined,
): number {
  const risk = side?.risk_result
  if (!risk) return 0
  return [
    risk.high_risk_warning,
    risk.authoritative_advice_warning,
    (risk as { critical_mismatch_warning?: boolean }).critical_mismatch_warning,
  ].filter(Boolean).length
}

function buildSummary(
  comparison: ExperimentComparison,
  question: Question | undefined,
): QuestionExperimentSummary | null {
  if (!question) return null
  const baseline = comparison.baseline
  const ai = comparison.ai_ethics_guided
  const buddhist =
    comparison.ai_ethics_buddhist_guided ??
    comparison.buddhist_ethics_guided ??
    comparison.buddhist_guided
  const baselineSafety = safetyOf(baseline)
  const aiSafety = safetyOf(ai)
  const buddhistSafety = safetyOf(buddhist)

  // 실험 레코드만 있고 조건 점수가 없으면 '분석됨'으로 치지 않음
  if (baselineSafety == null && aiSafety == null && buddhistSafety == null) {
    return null
  }

  const candidates: Array<{ key: Condition; value: number | null }> = [
    { key: 'baseline', value: baselineSafety },
    { key: 'ai_ethics_guided', value: aiSafety },
    { key: 'ai_ethics_buddhist_guided', value: buddhistSafety },
  ]
  const available = candidates.filter((c) => c.value != null) as Array<{
    key: Condition
    value: number
  }>
  const best =
    available.length === 0
      ? null
      : available.reduce((a, b) => (b.value > a.value ? b : a)).key

  const sources = [baseline, ai, buddhist]
    .map((s) => s?.risk_result?.evaluation_source)
    .filter(Boolean)
  const evaluationSource = sources.every((s) => s === 'human')
    ? 'human'
    : sources.some((s) => s === 'llm' || s === 'human')
      ? 'llm'
      : null

  const bestCondition =
    (normalizeCondition(comparison.safest_condition ?? '') as Condition | null) ?? best

  return {
    questionId: question.id,
    experimentId: comparison.experiment.id,
    questionText: question.text,
    domain: question.domain,
    createdAt: comparison.experiment.created_at,
    baselineSafety,
    aiSafety,
    buddhistSafety,
    deltaAi: safetyDelta(baselineSafety, aiSafety),
    deltaBuddhist: safetyDelta(baselineSafety, buddhistSafety),
    bestCondition,
    evaluationSource,
    warningCount: warnCount(baseline) + warnCount(ai) + warnCount(buddhist),
    comparison,
    baselineRisk: baselineSafety,
    aiRisk: aiSafety,
    buddhistRisk: buddhistSafety,
    safestCondition: bestCondition,
  }
}

export function useQuestionExperimentSummaries(questions: Question[]) {
  const [rows, setRows] = useState<QuestionExperimentSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (questions.length === 0) {
      setRows([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const experiments = await fetchExperiments()
      const latestByQuestion = new Map<number, (typeof experiments)[number]>()
      for (const exp of experiments) {
        if (exp.question_id == null) continue
        const prev = latestByQuestion.get(exp.question_id)
        if (!prev || exp.id > prev.id) latestByQuestion.set(exp.question_id, exp)
      }

      const questionMap = new Map(questions.map((q) => [q.id, q]))
      const entries = [...latestByQuestion.entries()]
      const summaries: QuestionExperimentSummary[] = []

      await Promise.all(
        entries.map(async ([questionId, exp]) => {
          try {
            const comparison = await fetchExperimentComparison(exp.id)
            const summary = buildSummary(comparison, questionMap.get(questionId))
            if (summary) summaries.push(summary)
          } catch {
            // skip failed comparison
          }
        }),
      )

      summaries.sort((a, b) => b.experimentId - a.experimentId)
      setRows(summaries)
    } catch (err) {
      setError(err instanceof Error ? err.message : '질문별 분석 결과를 불러오지 못했습니다.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [questions])

  useEffect(() => {
    void reload()
  }, [reload])

  return { rows, loading, error, reload }
}
