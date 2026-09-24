import { apiClient } from '@/api/client'

const TOKEN_KEY = 'researcher_token'

export type ResearcherStatus = {
  password_configured: boolean
  unlocked: boolean
}

export type ResearcherLogin = {
  token: string
  expires_at: string
}

export function getResearcherToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function setResearcherToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearResearcherToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export async function fetchResearcherStatus(): Promise<ResearcherStatus> {
  const token = getResearcherToken()
  const { data } = await apiClient.get<ResearcherStatus>('/api/researcher/status', {
    headers: token ? { 'X-Researcher-Token': token } : undefined,
  })
  return data
}

export async function loginResearcher(password: string): Promise<ResearcherLogin> {
  const { data } = await apiClient.post<ResearcherLogin>('/api/researcher/login', { password })
  setResearcherToken(data.token)
  return data
}
