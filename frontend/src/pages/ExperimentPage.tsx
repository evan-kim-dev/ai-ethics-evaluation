import { Navigate, useSearchParams } from 'react-router-dom'

/** @deprecated /experiment → /ethics-workspace */
export function ExperimentPage() {
  const [params] = useSearchParams()
  const qs = params.toString()
  return <Navigate to={qs ? `/ethics-workspace?${qs}` : '/ethics-workspace'} replace />
}
