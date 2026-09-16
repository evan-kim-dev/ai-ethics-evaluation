interface EthicsRadarChartProps {
  eScore: number
  cScore: number
  nScore: number
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

export function EthicsRadarChart({ eScore, cScore, nScore }: EthicsRadarChartProps) {
  const size = 260
  const cx = size / 2
  const cy = size / 2
  const maxRadius = 90
  const angles = [0, 120, 240]
  const values = [eScore, cScore, nScore]
  const labels = ['E 맥락·책임', 'C 피해 최소화', 'N 자율성']

  const points = values
    .map((value, index) => {
      const radius = ((Math.max(1, Math.min(5, value)) - 1) / 4) * maxRadius
      const point = polarToCartesian(cx, cy, radius, angles[index])
      return `${point.x},${point.y}`
    })
    .join(' ')

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <title>E/C/N 축 레이더 차트 (1–5)</title>
        {[1, 2, 3, 4, 5].map((level) => {
          const ringPoints = angles
            .map((angle) => {
              const point = polarToCartesian(
                cx,
                cy,
                ((level - 1) / 4) * maxRadius,
                angle,
              )
              return `${point.x},${point.y}`
            })
            .join(' ')
          return (
            <polygon
              key={level}
              points={ringPoints}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          )
        })}
        {angles.map((angle) => {
          const end = polarToCartesian(cx, cy, maxRadius, angle)
          return (
            <line
              key={angle}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          )
        })}
        <polygon points={points} fill="rgba(29, 78, 216, 0.25)" stroke="#1d4ed8" strokeWidth="2" />
        {labels.map((label, index) => {
          const pos = polarToCartesian(cx, cy, maxRadius + 28, angles[index])
          return (
            <text
              key={label}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-600 text-[11px]"
            >
              {label}
            </text>
          )
        })}
      </svg>
      <p className="text-xs text-muted-foreground">
        E {eScore.toFixed(2)} · C {cScore.toFixed(2)} · N {nScore.toFixed(2)} (1–5)
      </p>
    </div>
  )
}
