import axios from 'axios'

import { apiClient } from '@/api/client'
import type {
  BaselineRating,
  BaselineRatingInput,
  HumanEvaluation,
  HumanEvaluationInput,
  LLMEvaluation,
  PublicRatePage,
  RatingShareLink,
  RiskResult,
} from '@/types/evaluation'

function isNotFound(err: unknown): boolean {
  if (axios.isAxiosError(err) && err.response?.status === 404) return true
  if (err instanceof Error) {
    return /404|찾을 수 없습니다|Not Found|없습니다/.test(err.message)
  }
  return typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 404
}

export async function createHumanEvaluation(
  responseId: number,
  payload: HumanEvaluationInput,
): Promise<HumanEvaluation> {
  const { data } = await apiClient.post<HumanEvaluation>(
    `/api/responses/${responseId}/human-evaluation`,
    payload,
  )
  return data
}

export async function updateHumanEvaluation(
  evaluationId: number,
  payload: HumanEvaluationInput,
): Promise<HumanEvaluation> {
  const { data } = await apiClient.put<HumanEvaluation>(
    `/api/human-evaluations/${evaluationId}`,
    payload,
  )
  return data
}

export async function fetchHumanEvaluation(
  responseId: number,
): Promise<HumanEvaluation | null> {
  try {
    const { data } = await apiClient.get<HumanEvaluation>(
      `/api/responses/${responseId}/human-evaluation`,
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function createBaselineRating(
  responseId: number,
  payload: BaselineRatingInput,
  raterToken?: string,
): Promise<BaselineRating> {
  const { data } = await apiClient.post<BaselineRating>(
    `/api/responses/${responseId}/baseline-rating`,
    payload,
    raterToken ? { headers: { 'X-Rater-Token': raterToken } } : undefined,
  )
  return data
}

export async function updateBaselineRating(
  ratingId: number,
  payload: Partial<BaselineRatingInput>,
): Promise<BaselineRating> {
  const { data } = await apiClient.put<BaselineRating>(
    `/api/baseline-ratings/${ratingId}`,
    payload,
  )
  return data
}

export async function fetchBaselineRating(
  responseId: number,
  evaluatorId?: string,
): Promise<BaselineRating | null> {
  try {
    const { data } = await apiClient.get<BaselineRating>(
      `/api/responses/${responseId}/baseline-rating`,
      { params: evaluatorId ? { evaluator_id: evaluatorId } : undefined },
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function fetchBaselineRatings(responseId: number): Promise<BaselineRating[]> {
  const { data } = await apiClient.get<BaselineRating[]>(
    `/api/responses/${responseId}/baseline-ratings`,
  )
  return data
}

export async function createOrGetShareLink(responseId: number): Promise<RatingShareLink> {
  const { data } = await apiClient.post<RatingShareLink>(
    `/api/responses/${responseId}/share-link`,
  )
  return data
}

export async function fetchShareLink(responseId: number): Promise<RatingShareLink | null> {
  try {
    const { data } = await apiClient.get<RatingShareLink>(
      `/api/responses/${responseId}/share-link`,
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function fetchPublicRatePage(token: string): Promise<PublicRatePage> {
  const { data } = await apiClient.get<PublicRatePage>(`/api/public/rate/${token}`)
  return data
}

export async function submitPublicRating(
  token: string,
  payload: BaselineRatingInput,
): Promise<BaselineRating> {
  const { data } = await apiClient.post<BaselineRating>(`/api/public/rate/${token}`, payload)
  return data
}

export async function runLlmEvaluation(responseId: number): Promise<LLMEvaluation> {
  const { data } = await apiClient.post<LLMEvaluation>(
    `/api/responses/${responseId}/llm-evaluation`,
    undefined,
    { timeout: 120000 },
  )
  return data
}

export async function fetchLlmEvaluation(
  responseId: number,
): Promise<LLMEvaluation | null> {
  try {
    const { data } = await apiClient.get<LLMEvaluation>(
      `/api/responses/${responseId}/llm-evaluation`,
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export type IssuedRaterAccount = {
  evaluator_id: string
  password: string
}

export type RaterLogin = {
  evaluator_id: string
  token: string
  expires_at: string
}

export async function issueRaterAccount(): Promise<IssuedRaterAccount> {
  const { data } = await apiClient.post<IssuedRaterAccount>('/api/rater-accounts')
  return data
}

export async function loginRaterAccount(evaluatorId: string, password: string): Promise<RaterLogin> {
  const { data } = await apiClient.post<RaterLogin>('/api/rater-accounts/login', {
    evaluator_id: evaluatorId,
    password,
  })
  return data
}

export async function fetchRiskResult(responseId: number): Promise<RiskResult | null> {
  try {
    const { data } = await apiClient.get<RiskResult>(
      `/api/responses/${responseId}/risk-result`,
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}
