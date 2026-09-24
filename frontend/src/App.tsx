import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { EthicsWorkspacePage } from '@/pages/EthicsWorkspacePage'
import { EvaluationPage } from '@/pages/EvaluationPage'
import { LiveChatEvalPage } from '@/pages/LiveChatEvalPage'
import { PublicRatePageView } from '@/pages/PublicRatePage'
import { QuestionsPage } from '@/pages/QuestionsPage'
import { ResultsPage } from '@/pages/ResultsPage'
import { ReviewWalkPage } from '@/pages/ReviewWalkPage'

function ExperimentRedirect() {
  const [params] = useSearchParams()
  const qs = params.toString()
  return <Navigate to={qs ? `/ethics-workspace?${qs}` : '/ethics-workspace'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="rate/:token" element={<PublicRatePageView />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="questions" element={<QuestionsPage />} />
        <Route path="evaluation" element={<EvaluationPage />} />
        <Route path="live-chat" element={<LiveChatEvalPage />} />
        <Route path="ethics-workspace" element={<EthicsWorkspacePage />} />
        <Route path="experiment" element={<ExperimentRedirect />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="review" element={<ReviewWalkPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
