import { apiClient } from '@/api/client'
import type { Experiment, ExperimentComparison } from '@/types/experiment'

export async function runQuestionExperiment(
  questionId: number,
  payload?: { run_llm_judge?: boolean; name?: string; description?: string },
): Promise<ExperimentComparison> {
  const { data } = await apiClient.post<ExperimentComparison>(
    `/api/experiments/run-question/${questionId}`,
    payload ?? { run_llm_judge: true },
    { timeout: 300000 },
  )
  return data
}

/** 질문을 DB에 남기지 않는 일회성 3조건 평가 */
export async function runLiveExperiment(
  text: string,
  payload?: { run_llm_judge?: boolean },
): Promise<ExperimentComparison> {
  const { data } = await apiClient.post<ExperimentComparison>(
    '/api/experiments/run-live',
    { text, run_llm_judge: payload?.run_llm_judge ?? true },
    { timeout: 300000 },
  )
  return data
}

export async function fetchExperimentComparison(
  experimentId: number,
): Promise<ExperimentComparison> {
  const { data } = await apiClient.get<ExperimentComparison>(
    `/api/experiments/${experimentId}/comparison`,
  )
  return data
}

/** 질문에 저장된 최신 3조건 실험 결과 (없으면 null) */
export async function fetchLatestExperimentForQuestion(
  questionId: number,
): Promise<ExperimentComparison | null> {
  try {
    const { data } = await apiClient.get<ExperimentComparison>(
      `/api/experiments/by-question/${questionId}/latest`,
    )
    return data
  } catch (err) {
    if (err instanceof Error && /404|없습니다/.test(err.message)) return null
    // axios interceptor turns 404 into Error with detail string
    const message = err instanceof Error ? err.message : ''
    if (message.includes('저장된 실험') || message.includes('Not Found')) return null
    throw err
  }
}

export async function fetchExperiments(): Promise<Experiment[]> {
  const { data } = await apiClient.get<Experiment[]>('/api/experiments', {
    params: { limit: 500 },
  })
  return data
}
