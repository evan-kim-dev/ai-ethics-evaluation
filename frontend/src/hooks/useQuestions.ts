import { useCallback, useEffect, useState } from 'react'

import {
  createQuestion,
  deleteQuestion,
  fetchQuestions,
  resetToInitialState,
  seedQuestions,
} from '@/api/questions'
import type { Question, QuestionCreate } from '@/types/question'

interface UseQuestionsResult {
  questions: Question[]
  total: number
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  addQuestion: (payload: QuestionCreate) => Promise<Question>
  removeQuestion: (id: number) => Promise<void>
  runSeed: () => Promise<string>
  runResetInitial: () => Promise<string>
}

export function useQuestions(): UseQuestionsResult {
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchQuestions()
      setQuestions(data.items)
      setTotal(data.total)
    } catch (err) {
      const message = err instanceof Error ? err.message : '질문을 불러오지 못했습니다.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const addQuestion = async (payload: QuestionCreate) => {
    const created = await createQuestion(payload)
    await reload()
    return created
  }

  const removeQuestion = async (id: number) => {
    await deleteQuestion(id)
    await reload()
  }

  const runSeed = async () => {
    const result = await seedQuestions()
    await reload()
    return result.message
  }

  const runResetInitial = async () => {
    const result = await resetToInitialState()
    await reload()
    return result.message
  }

  return {
    questions,
    total,
    loading,
    error,
    reload,
    addQuestion,
    removeQuestion,
    runSeed,
    runResetInitial,
  }
}
