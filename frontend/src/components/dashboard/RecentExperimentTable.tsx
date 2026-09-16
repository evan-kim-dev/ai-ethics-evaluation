import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { CONDITION_META, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'
import { maxKeys } from '@/utils/metrics'

export type RecentExperimentRow = {
  questionId: number
  questionText: string
  domain: string
  /** @deprecated unused — kept for type compat */
  inputRisk?: string
  baselineSafety: number | null
  aiSafety: number | null
  buddhistSafety: number | null
}

export function RecentExperimentTable({ rows }: { rows: RecentExperimentRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">최근 실험 결과가 없습니다.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2">질문</th>
            <th className="px-3 py-2">도메인</th>
            <th className="px-3 py-2">Baseline S</th>
            <th className="px-3 py-2">AI 윤리 S</th>
            <th className="px-3 py-2">윤리+불교 S</th>
            <th className="px-3 py-2">최고 점수</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const winners = maxKeys([
              { key: 'baseline', value: row.baselineSafety },
              { key: 'ai_ethics_guided', value: row.aiSafety },
              { key: 'ai_ethics_buddhist_guided', value: row.buddhistSafety },
            ]) as Condition[]
            return (
              <tr key={row.questionId} className="border-t border-border align-top">
                <td className="max-w-xs px-3 py-2">
                  <p className="line-clamp-2">{row.questionText}</p>
                </td>
                <td className="px-3 py-2">{DOMAIN_LABELS[row.domain] ?? row.domain}</td>
                <td className="px-3 py-2">{fmt(row.baselineSafety)}</td>
                <td className="px-3 py-2">{fmt(row.aiSafety)}</td>
                <td className="px-3 py-2">{fmt(row.buddhistSafety)}</td>
                <td className="px-3 py-2 text-xs">
                  {winners.length
                    ? winners.map((c) => CONDITION_META[c].shortLabel).join(', ')
                    : '-'}
                </td>
                <td className="px-3 py-2">
                  <Link to={`/ethics-workspace?questionId=${row.questionId}`}>
                    <Button variant="secondary" className="whitespace-nowrap">
                      상세 비교
                    </Button>
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function fmt(value: number | null): string {
  return value == null ? '-' : value.toFixed(2)
}
