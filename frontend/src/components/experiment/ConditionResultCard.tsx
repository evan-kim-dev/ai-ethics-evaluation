import { Link } from 'react-router-dom'

import { ConditionHeader } from '@/components/experiment/ConditionHeader'
import { EvaluationReasoningAccordion } from '@/components/experiment/EvaluationReasoningAccordion'
import { ResponseTextPanel } from '@/components/experiment/ResponseTextPanel'
import { RubricScoreList } from '@/components/experiment/RubricScoreList'
import { SourceCitationPanel } from '@/components/experiment/SourceCitationPanel'
import { WarningList } from '@/components/experiment/WarningList'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ConditionExperimentResult } from '@/types/comparison'
import { axisAverages, overallSafetyScore } from '@/utils/metrics'

export function ConditionResultCard({ result }: { result: ConditionExperimentResult }) {
  const risk = result.risk_result
  const axes = axisAverages(result.evaluation)
  const safety = overallSafetyScore({
    overall_safety_score: risk?.overall_safety_score,
    evaluation: result.evaluation,
    E_score: risk?.E_score,
    C_score: risk?.C_score,
    N_score: risk?.N_score,
  })
  const warningCount = [
    risk?.high_risk_warning,
    risk?.authoritative_advice_warning,
    risk?.critical_mismatch_warning,
  ].filter(Boolean).length

  return (
    <Card className="flex h-full flex-col space-y-4">
      <ConditionHeader
        condition={result.condition}
        safetyScore={safety}
        warningCount={warningCount}
        evaluationSource={risk?.evaluation_source}
      />

      <div>
        <p className="mb-2 text-sm font-medium">핵심 평가 요약</p>
        <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
          <Metric label="설명가능성 (E)" value={axes.E} />
          <Metric label="위해예방 (C)" value={axes.C} />
          <Metric label="비권위·자율 (N)" value={axes.N} />
          <Metric label="상황 대응 (O7)" value={result.evaluation?.O7 ?? risk?.input_output_alignment_score} />
        </div>
      </div>

      <SourceCitationPanel
        title="응답 생성 시 검색된 출처"
        sources={result.response.retrieved_sources}
      />

      <ResponseTextPanel text={result.response.response_text} />

      <div>
        <p className="mb-2 text-sm font-medium">세부 루브릭 점수</p>
        <RubricScoreList scores={result.evaluation} />
      </div>

      <EvaluationReasoningAccordion
        source={risk?.evaluation_source}
        reasoning={result.evaluation?.reasoning}
        note={result.evaluation?.note}
        citations={result.evaluation?.citations}
      />

      <SourceCitationPanel
        title="평가 시 검색된 출처"
        sources={result.evaluation?.retrieved_sources}
        citedIds={result.evaluation?.citations}
      />

      <div>
        <p className="mb-2 text-sm font-medium">경고</p>
        <WarningList
          highRiskWarning={risk?.high_risk_warning}
          authoritativeAdviceWarning={risk?.authoritative_advice_warning}
          criticalMismatchWarning={risk?.critical_mismatch_warning}
        />
      </div>

      <div className="mt-auto pt-2">
        <Link to={`/evaluation?responseId=${result.response.id}`}>
          <Button variant="secondary" className="w-full">
            인간 평가 수정
          </Button>
        </Link>
      </div>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-md bg-muted px-2 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value == null ? '-' : value.toFixed(2)}</p>
    </div>
  )
}
