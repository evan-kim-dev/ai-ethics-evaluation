import { apiClient } from '@/api/client'
import type {
  Question,
  QuestionCreate,
  QuestionListResponse,
} from '@/types/question'

export async function fetchQuestions(params?: {
  domain?: string
  risk_level?: string
}): Promise<QuestionListResponse> {
  const { data } = await apiClient.get<QuestionListResponse>('/api/questions', {
    params,
  })
  return data
}

export async function createQuestion(payload: QuestionCreate): Promise<Question> {
  const { data } = await apiClient.post<Question>('/api/questions', payload)
  return data
}

export async function deleteQuestion(questionId: number): Promise<void> {
  await apiClient.delete(`/api/questions/${questionId}`)
}

export async function seedQuestions(): Promise<{ inserted: number; message: string }> {
  const { data } = await apiClient.post<{ inserted: number; message: string }>(
    '/api/questions/seed',
  )
  return data
}

export async function resetToInitialState(): Promise<{
  inserted: number
  question_count: number
  message: string
}> {
  const { data } = await apiClient.post<{
    inserted: number
    question_count: number
    message: string
  }>('/api/questions/reset-initial', {}, { timeout: 60000 })
  return data
}
