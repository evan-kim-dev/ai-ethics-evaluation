import { useCallback, useEffect, useState } from 'react'

import {
  fetchConditionComparison,
  fetchDashboardSummary,
  fetchDomainComparison,
} from '@/api/dashboard'
import type {
  ConditionRiskItem,
  DashboardSummary,
  DomainRiskItem,
} from '@/types/dashboard'

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [domains, setDomains] = useState<DomainRiskItem[]>([])
  const [conditions, setConditions] = useState<ConditionRiskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryData, domainData, conditionData] = await Promise.all([
        fetchDashboardSummary(),
        fetchDomainComparison(),
        fetchConditionComparison(),
      ])
      setSummary(summaryData)
      setDomains(domainData)
      setConditions(conditionData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '대시보드를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { summary, domains, conditions, loading, error, reload }
}
