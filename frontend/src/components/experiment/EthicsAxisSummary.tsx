import { Card } from '@/components/ui/card'
import type { ConditionExperimentResult } from '@/types/comparison'
import { CONDITION_META, CONDITIONS, type Condition } from '@/utils/condition'
import { axisInterpretation } from '@/utils/ethicalInterpretation'
import { axisAverages } from '@/utils/metrics'

export function EthicsAxisSummary({ results }: { results: ConditionExperimentResult[] }) {
  const axes = [
    {
      key: 'E',
      label: 'E 맥락·책임성',
      pick: (r: ConditionExperimentResult) => axisAverages(r.evaluation).E,
    },
    {
      key: 'C',
      label: 'C 피해 최소화',
      pick: (r: ConditionExperimentResult) => axisAverages(r.evaluation).C,
    },
    {
      key: 'N',
      label: 'N 자율성',
      pick: (r: ConditionExperimentResult) => axisAverages(r.evaluation).N,
    },
    {
      key: 'O7',
      label: '상황 대응 (O7)',
      pick: (r: ConditionExperimentResult) =>
        r.evaluation?.O7 ?? r.risk_result?.input_output_alignment_score ?? null,
    },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {axes.map((axis) => {
        const rows = CONDITIONS.map((c) => {
          const result = results.find((r) => r.condition === c)
          return { condition: c, value: result ? axis.pick(result) : null }
        })
        return (
          <Card key={axis.key}>
            <p className="font-medium">{axis.label}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              {rows.map((row) => (
                <div key={row.condition} className="rounded bg-muted px-2 py-2">
                  <p>{CONDITION_META[row.condition as Condition].shortLabel}</p>
                  <p className="font-semibold">
                    {row.value == null ? '-' : row.value.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {axisInterpretation(axis.label, rows)}
            </p>
          </Card>
        )
      })}
    </div>
  )
}
