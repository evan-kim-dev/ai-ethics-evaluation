import { apiClient } from '@/api/client'
import { getApiBaseUrl } from '@/lib/runtimeConfig'
import type {
  ConditionRiskItem,
  DashboardSummary,
  DomainRiskItem,
  ResultsPayload,
} from '@/types/dashboard'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/api/dashboard/summary')
  return data
}

export async function fetchDomainComparison(): Promise<DomainRiskItem[]> {
  const { data } = await apiClient.get<DomainRiskItem[]>('/api/dashboard/domain-comparison')
  return data
}

export async function fetchConditionComparison(): Promise<ConditionRiskItem[]> {
  const { data } = await apiClient.get<ConditionRiskItem[]>(
    '/api/dashboard/condition-comparison',
  )
  return data
}

export async function fetchResultsPayload(): Promise<ResultsPayload> {
  const { data } = await apiClient.get<ResultsPayload>('/api/dashboard/results')
  return data
}

export function getResultsCsvUrl(): string {
  return `${getApiBaseUrl()}/api/dashboard/results.csv`
}
