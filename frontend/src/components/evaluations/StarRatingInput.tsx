import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

const STEPS = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5)

function fillRatio(starIndex: number, value: number): number {
  const start = starIndex
  const end = starIndex + 1
  if (value >= end) return 1
  if (value <= start) return 0
  return value - start
}

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const ratio = fillRatio(starIndex, value)
          return (
            <div key={starIndex} className="relative h-9 w-9">
              <Star size={34} className="absolute inset-0 m-auto text-slate-300" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${ratio * 100}%` }}
              >
                <Star size={34} className="m-auto fill-amber-400 text-amber-400" />
              </div>
              <button
                type="button"
                disabled={disabled}
                aria-label={`${starIndex + 0.5}점`}
                className="absolute inset-y-0 left-0 w-1/2 disabled:cursor-not-allowed"
                onClick={() => onChange(Math.max(1, starIndex + 0.5))}
              />
              <button
                type="button"
                disabled={disabled}
                aria-label={`${starIndex + 1}점`}
                className="absolute inset-y-0 right-0 w-1/2 disabled:cursor-not-allowed"
                onClick={() => onChange(starIndex + 1)}
              />
            </div>
          )
        })}
        <span className="ml-2 text-lg font-semibold text-amber-700">{value.toFixed(1)}</span>
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            disabled={disabled}
            onClick={() => onChange(step)}
            className={cn(
              'rounded-md border px-2 py-1.5 text-xs font-medium transition sm:px-2 sm:py-1',
              value === step
                ? 'border-amber-500 bg-amber-50 text-amber-800'
                : 'border-border bg-white text-slate-600 hover:bg-muted',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {step.toFixed(1)}점
          </button>
        ))}
      </div>
    </div>
  )
}
