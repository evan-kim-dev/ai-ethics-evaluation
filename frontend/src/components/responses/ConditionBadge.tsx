import { cn } from '@/lib/utils'
import { CONDITION_META, normalizeCondition } from '@/utils/condition'

export function ConditionBadge({ condition }: { condition: string }) {
  const key = normalizeCondition(condition)
  const meta = key ? CONDITION_META[key] : null
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
        meta?.badgeClass ?? 'border-slate-300 bg-slate-50 text-slate-700',
      )}
    >
      {meta?.label ?? condition}
    </span>
  )
}
