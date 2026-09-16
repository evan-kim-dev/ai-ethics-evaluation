import type { ConditionExperimentResult, RubricKey } from '@/types/comparison'
import { CONDITION_META, CONDITIONS } from '@/utils/condition'
import { RUBRIC_ITEMS } from '@/utils/metrics'

export function ThreeConditionRadarChart({ results }: { results: ConditionExperimentResult[] }) {
  const size = 320
  const cx = size / 2
  const cy = size / 2
  const maxR = 110
  const keys = RUBRIC_ITEMS.map((i) => i.key as RubricKey)
  const angles = keys.map((_, i) => -90 + (360 / keys.length) * i)

  const polar = (value: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180
    const r = (Math.max(0, Math.min(4, value)) / 4) * maxR
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="max-w-md">
        {[1, 2, 3, 4].map((level) => {
          const pts = angles
            .map((angle) => {
              const p = polar(level, angle)
              return `${p.x},${p.y}`
            })
            .join(' ')
          return <polygon key={level} points={pts} fill="none" stroke="#e2e8f0" />
        })}
        {angles.map((angle, idx) => {
          const end = polar(4, angle)
          const labelPos = polar(4.6, angle)
          return (
            <g key={keys[idx]}>
              <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#cbd5e1" />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-600 text-[10px]"
              >
                {keys[idx]}
              </text>
            </g>
          )
        })}
        {CONDITIONS.map((condition) => {
          const result = results.find((r) => r.condition === condition)
          if (!result?.evaluation) return null
          const pts = keys
            .map((key, idx) => {
              const p = polar(result.evaluation![key], angles[idx])
              return `${p.x},${p.y}`
            })
            .join(' ')
          const color = CONDITION_META[condition].chartColor
          return (
            <polygon
              key={condition}
              points={pts}
              fill={`${color}33`}
              stroke={color}
              strokeWidth="2"
            />
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
        {CONDITIONS.map((c) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CONDITION_META[c].chartColor }}
            />
            {CONDITION_META[c].shortLabel}
          </span>
        ))}
      </div>
    </div>
  )
}
