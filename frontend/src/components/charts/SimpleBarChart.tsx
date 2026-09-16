interface BarItem {
  label: string
  value: number
  color?: string
}

export function SimpleBarChart({
  items,
  maxValue = 100,
  unit = '',
}: {
  items: BarItem[]
  maxValue?: number
  unit?: string
}) {
  const peak = Math.max(maxValue, ...items.map((item) => item.value), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-700">{item.label}</span>
            <span className="font-medium text-slate-900">
              {item.value.toFixed(1)}
              {unit}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (item.value / peak) * 100)}%`,
                backgroundColor: item.color ?? '#1d4ed8',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
