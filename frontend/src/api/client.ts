import axios from 'axios'

import {
  getApiBaseUrl,
  getLlmApiKey,
  getLlmBaseUrl,
  getLlmModel,
} from '@/lib/runtimeConfig'

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl()

  const llmKey = getLlmApiKey()
  const llmModel = getLlmModel()
  const llmBaseUrl = getLlmBaseUrl()

  if (llmKey) config.headers.set('X-LLM-API-Key', llmKey)
  else if (config.headers.has('X-LLM-API-Key')) config.headers.delete('X-LLM-API-Key')

  if (llmModel) config.headers.set('X-LLM-Model', llmModel)
  else if (config.headers.has('X-LLM-Model')) config.headers.delete('X-LLM-Model')

  if (llmBaseUrl) config.headers.set('X-LLM-Base-URL', llmBaseUrl)
  else if (config.headers.has('X-LLM-Base-URL')) config.headers.delete('X-LLM-Base-URL')

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail
      if (typeof detail === 'string') {
        return Promise.reject(new Error(detail))
      }
      if (Array.isArray(detail)) {
        const messages = detail
          .map((item: { msg?: string }) => item.msg)
          .filter(Boolean)
          .join(', ')
        return Promise.reject(new Error(messages || '요청 검증에 실패했습니다.'))
      }
      return Promise.reject(new Error(error.message || 'API 요청에 실패했습니다.'))
    }
    return Promise.reject(error)
  },
)
