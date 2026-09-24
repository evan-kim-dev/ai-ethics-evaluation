import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

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
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label="별점"
      >
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const ratio = fillRatio(starIndex, value ?? 0)
          return (
            <div key={starIndex} className="relative h-10 w-10">
              <Star size={32} strokeWidth={1.75} className="absolute inset-0 m-auto text-border" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${ratio * 100}%` }}>
                <Star size={32} strokeWidth={1.75} className="m-auto fill-amber-400 text-amber-400" />
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
      </div>
      <div className="min-w-[4.5rem]">
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {value == null ? '-' : value.toFixed(1)}
        </p>
        <p className="text-xs text-muted-foreground">1.0–5.0 · 반 칸</p>
      </div>
      {value != null ? (
        <input
          type="range"
          min={1}
          max={5}
          step={0.5}
          value={value}
          disabled={disabled}
          aria-label="별점 조절"
          onChange={(event) => onChange(Number(event.target.value))}
          className={cn(
            'h-1.5 w-full max-w-xs cursor-pointer accent-[#3182f6] disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      ) : (
        <p className="text-sm text-muted-foreground">별을 눌러 점수를 선택해 주세요.</p>
      )}
    </div>
  )
}
