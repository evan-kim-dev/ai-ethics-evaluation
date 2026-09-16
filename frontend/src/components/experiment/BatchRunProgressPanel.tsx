import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export type BatchRunProgress = {
  current: number
  total: number
  label?: string
  questionId?: number
  questionPreview?: string
  successCount?: number
  failCount?: number
  phase?: 'running' | 'done'
}

export function BatchRunProgressPanel({
  progress,
  elapsedSec,
  className,
}: {
  progress: BatchRunProgress
  elapsedSec: number
  className?: string
}) {
  const total = Math.max(1, progress.total)
  const done = Math.min(progress.current, progress.total)
  const pct = Math.round((done / total) * 100)
  const isDone = progress.phase === 'done'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border px-4 py-3 shadow-sm',
        isDone
          ? 'border-green-200 bg-green-50 text-green-950'
          : 'border-indigo-200 bg-indigo-50 text-indigo-950',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isDone ? null : (
              <Loader2 size={16} className="shrink-0 animate-spin text-indigo-600" />
            )}
            <p className="text-sm font-semibold">
              {isDone
                ? '일괄 실행 완료'
                : `${progress.label ?? '일괄 실험'} 진행 중`}
            </p>
          </div>
          <p className="mt-1 text-xs opacity-80">
            {isDone
              ? `성공 ${progress.successCount ?? done} · 실패 ${progress.failCount ?? 0} · 총 ${progress.total}문항`
              : progress.questionId != null
                ? `현재 Q#${progress.questionId} · ${done}/${progress.total} 완료`
                : `${done}/${progress.total} 완료`}
          </p>
          {progress.questionPreview && !isDone ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-90">
              {progress.questionPreview}
            </p>
          ) : null}
        </div>
        <div className="text-right text-xs tabular-nums opacity-80">
          <p className="text-lg font-bold opacity-100">{pct}%</p>
          <p>경과 {elapsedSec}초</p>
        </div>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isDone ? 'bg-green-600' : 'bg-indigo-600',
            !isDone && 'animate-pulse',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {!isDone ? (
        <div className="mt-2 flex gap-1">
          {Array.from({ length: Math.min(progress.total, 24) }).map((_, idx) => {
            const filled = idx < done
            const active = idx === done && done < progress.total
            return (
              <span
                key={idx}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  filled
                    ? 'bg-indigo-600'
                    : active
                      ? 'animate-pulse bg-indigo-400'
                      : 'bg-indigo-100',
                )}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
