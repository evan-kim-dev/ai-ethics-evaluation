import { apiClient } from '@/api/client'
import type {
  AIResponse,
  Condition,
  ResponseCreate,
  ResponseListResponse,
  ResponseUpdate,
} from '@/types/response'

export async function createResponse(payload: ResponseCreate): Promise<AIResponse> {
  const { data } = await apiClient.post<AIResponse>('/api/responses', payload)
  return data
}

export async function generateResponse(payload: {
  question_id: number
  condition: Condition
}): Promise<AIResponse> {
  const { data } = await apiClient.post<AIResponse>('/api/responses/generate', payload, {
    timeout: 120000,
  })
  return data
}

export async function fetchResponse(responseId: number): Promise<AIResponse> {
  const { data } = await apiClient.get<AIResponse>(`/api/responses/${responseId}`)
  return data
}

export async function fetchQuestionResponses(
  questionId: number,
): Promise<ResponseListResponse> {
  const { data } = await apiClient.get<ResponseListResponse>(
    `/api/questions/${questionId}/responses`,
  )
  return data
}

export async function updateResponse(
  responseId: number,
  payload: ResponseUpdate,
): Promise<AIResponse> {
  const { data } = await apiClient.put<AIResponse>(`/api/responses/${responseId}`, payload)
  return data
}

export async function deleteResponse(responseId: number): Promise<void> {
  await apiClient.delete(`/api/responses/${responseId}`)
}
