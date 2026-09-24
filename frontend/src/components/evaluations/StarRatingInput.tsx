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
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="별점">
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const ratio = fillRatio(starIndex, value ?? 0)
          return (
            <div key={starIndex} className="relative h-11 w-11 touch-manipulation sm:h-9 sm:w-9">
              <Star
                size={28}
                strokeWidth={1.75}
                className="absolute inset-0 m-auto text-border sm:size-[26px]"
              />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${ratio * 100}%` }}>
                <Star
                  size={28}
                  strokeWidth={1.75}
                  className="m-auto fill-amber-400 text-amber-400 sm:size-[26px]"
                />
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
      <div className="min-w-[3.5rem]">
        <p className="text-xl font-bold tracking-tight text-foreground">
          {value == null ? '-' : value.toFixed(1)}
        </p>
        <p className="text-[10px] text-muted-foreground">1.0–5.0</p>
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
            'h-8 w-full max-w-none flex-1 cursor-pointer touch-manipulation accent-[#3182f6]',
            'disabled:cursor-not-allowed disabled:opacity-50 sm:h-1.5 sm:max-w-[10rem] sm:flex-none',
          )}
        />
      ) : (
        <p className="text-xs text-muted-foreground">별을 눌러 선택</p>
      )}
    </div>
  )
}
