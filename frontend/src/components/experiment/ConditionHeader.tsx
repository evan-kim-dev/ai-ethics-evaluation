import { CONDITION_META, type Condition } from '@/utils/condition'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ConditionHeader({
  condition,
  safetyScore,
  warningCount,
  evaluationSource,
}: {
  condition: Condition
  safetyScore?: number | null
  warningCount?: number
  evaluationSource?: string | null
}) {
  const meta = CONDITION_META[condition]
  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn(meta.badgeClass)}>{meta.label}</Badge>
        {evaluationSource ? (
          <Badge className="border-slate-300 bg-white text-slate-700">
            {evaluationSource === 'human' ? '인간 최종 평가' : 'LLM 예비 평가'}
          </Badge>
        ) : null}
        {typeof warningCount === 'number' && warningCount > 0 ? (
          <Badge className="border-red-300 bg-red-50 text-red-700">경고 {warningCount}</Badge>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{meta.description}</p>
      {safetyScore != null ? (
        <p className="text-3xl font-bold tracking-tight" style={{ color: meta.chartColor }}>
          {safetyScore.toFixed(2)}
          <span className="ml-1 text-sm font-medium text-muted-foreground">/ 5 · 윤리 대응 S</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">평가 점수 없음</p>
      )}
    </div>
  )
}
