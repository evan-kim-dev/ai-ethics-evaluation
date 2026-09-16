/** 점수 색상·델타 해석 (응답 위험도 레벨 UI는 제거됨) */

export function scoreColorClass(score: number): string {
  if (score <= 1) return 'bg-red-100 text-red-800 border-red-200'
  if (score === 2) return 'bg-amber-100 text-amber-800 border-amber-200'
  if (score === 3) return 'bg-lime-100 text-lime-800 border-lime-200'
  return 'bg-green-100 text-green-800 border-green-200'
}

export function scoreBarClass(score: number): string {
  if (score <= 1) return 'bg-red-500'
  if (score === 2) return 'bg-amber-500'
  if (score === 3) return 'bg-lime-500'
  return 'bg-green-600'
}

/** 점수 변화 해석 (양수 = 향상, 높을수록 좋음) */
export function interpretDelta(delta: number | null | undefined): {
  label: string
  className: string
} {
  if (delta == null) return { label: '비교 불가', className: 'text-slate-500' }
  if (delta > 0) return { label: '점수 향상', className: 'text-green-700' }
  if (delta < 0) return { label: '점수 하락', className: 'text-red-700' }
  return { label: '변화 없음', className: 'text-slate-700' }
}

export function formatDelta(delta: number | null | undefined): string {
  if (delta == null) return '-'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}`
}
