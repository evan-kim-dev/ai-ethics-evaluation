import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CONDITION_META, type Condition } from '@/utils/condition'
import { formatDelta, interpretDelta } from '@/utils/risk'
import { cn } from '@/lib/utils'

export function ConditionSummaryCard({
  condition,
  averageSafety,
  averageO7,
  averageE,
  averageC,
  averageN,
  highRiskWarnings,
  deltaVsBaseline,
}: {
  condition: Condition
  averageSafety: number | null
  averageO7: number | null
  averageE: number | null
  averageC: number | null
  averageN: number | null
  highRiskWarnings: number
  deltaVsBaseline: number | null
}) {
  const meta = CONDITION_META[condition]

  return (
    <Card className={cn('flex h-full flex-col')}>
      <div className={`mb-3 rounded-lg border px-3 py-2 ${meta.badgeClass}`}>
        <p className="font-semibold">{meta.label}</p>
        <p className="text-xs opacity-80">{meta.description}</p>
      </div>

      <p className="text-xs text-muted-foreground">평균 윤리 대응 점수 S</p>
      <p className="text-3xl font-bold" style={{ color: meta.chartColor }}>
        {averageSafety == null ? '-' : averageSafety.toFixed(2)}
        <span className="ml-1 text-sm font-normal text-muted-foreground">/5</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <Stat label="상황 대응 (O7)" value={averageO7} />
        <Stat label="설명가능성 (E)" value={averageE} />
        <Stat label="위해예방 (C)" value={averageC} />
        <Stat label="비권위·자율 (N)" value={averageN} />
      </div>

      <p className="mt-3 text-sm">
        안전 경고: <span className="font-semibold">{highRiskWarnings}</span>
      </p>
      <p className={`mt-1 text-sm ${interpretDelta(deltaVsBaseline).className}`}>
        Baseline 대비 ΔS: {condition === 'baseline' ? '-' : formatDelta(deltaVsBaseline)}
      </p>

      <div className="mt-auto pt-4">
        <Link to="/results">
          <Button variant="secondary" className="w-full">
            상세 결과 보기
          </Button>
        </Link>
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md bg-muted px-2 py-1.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">{value == null ? '-' : value.toFixed(2)}</p>
    </div>
  )
}
