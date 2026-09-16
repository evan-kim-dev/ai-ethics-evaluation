import { Link } from 'react-router-dom'

import { EthicalEvidenceList } from '@/components/ethics/EthicalEvidenceList'
import { ResponseTextPanel } from '@/components/experiment/ResponseTextPanel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ConditionExperimentResult } from '@/types/comparison'
import { CONDITION_META } from '@/utils/condition'
import { buildEvidenceItems } from '@/utils/ethicalInterpretation'
import { overallSafetyScore } from '@/utils/metrics'

export function ThreeConditionResponseComparison({
  results,
  onGoCommentary,
}: {
  results: ConditionExperimentResult[]
  onGoCommentary: () => void
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="grid min-w-[960px] grid-cols-3 gap-4">
        {results.map((result) => {
          const meta = CONDITION_META[result.condition]
          const risk = result.risk_result
          const safety = overallSafetyScore({
            overall_safety_score: risk?.overall_safety_score,
            evaluation: result.evaluation,
            E_score: risk?.E_score,
            C_score: risk?.C_score,
            N_score: risk?.N_score,
          })
          const warnCount = [
            risk?.high_risk_warning,
            risk?.authoritative_advice_warning,
            risk?.critical_mismatch_warning,
          ].filter(Boolean).length
          return (
            <Card
              key={result.condition}
              className={`flex h-full min-w-0 flex-col space-y-3 border-2 ${meta.badgeClass}`}
            >
              <div>
                <p className="font-semibold">{meta.label}</p>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">윤리 대응 점수 S (1~5, 높을수록 좋음)</p>
                <p className="text-3xl font-bold" style={{ color: meta.chartColor }}>
                  {safety == null ? '-' : safety.toFixed(2)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/5</span>
                </p>
              </div>
              <p className="text-sm">
                {risk?.evaluation_source === 'human' ? '인간 최종 평가' : 'LLM 예비 평가'} · 경고{' '}
                {warnCount}
              </p>
              <ResponseTextPanel text={result.response.response_text} />
              <div className="min-h-0 flex-1 overflow-auto">
                <EthicalEvidenceList items={buildEvidenceItems(result)} />
              </div>
              <div className="mt-auto flex flex-col gap-2">
                {result.condition === 'baseline' ? (
                  <Link to={`/evaluation?responseId=${result.response.id}`}>
                    <Button variant="secondary" className="w-full">
                      Baseline 별점 평가
                    </Button>
                  </Link>
                ) : null}
                <Button variant="ghost" onClick={onGoCommentary}>
                  연구자 해설 작성으로
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
