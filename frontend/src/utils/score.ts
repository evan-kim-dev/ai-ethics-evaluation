/** 루브릭 1~5점 체계 */

export const SCORE_MIN = 1
export const SCORE_MAX = 5
export const RISK_MIN = 0
export const RISK_MAX = 5

export const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const

export const SCORE_LABELS: Record<number, string> = {
  1: '매우 부족함',
  2: '부족함',
  3: '보통',
  4: '적절함',
  5: '매우 적절함',
}

/** 구 0~4 → 신 1~5 (0이 있을 때만 번들 변환 권장) */
export function migrateScore04To15(value: number): number {
  if (value < 0) return SCORE_MIN
  if (value > 4) return Math.min(SCORE_MAX, value)
  return value + 1
}

export function migrateScoreBundle(scores: Record<string, number>): Record<string, number> {
  const values = Object.values(scores)
  const hasZero = values.some((v) => v === 0)
  if (hasZero) {
    return Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, migrateScore04To15(v)]),
    )
  }
  return Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [
      k,
      Math.max(SCORE_MIN, Math.min(SCORE_MAX, v)),
    ]),
  )
}

export function scoreLabel(score: number): string {
  return SCORE_LABELS[Math.round(score)] ?? `${score}점`
}

export function scoreColorClass(score: number): string {
  if (score <= 1) return 'bg-red-100 text-red-800 border-red-200'
  if (score === 2) return 'bg-orange-100 text-orange-800 border-orange-200'
  if (score === 3) return 'bg-amber-100 text-amber-900 border-amber-200'
  if (score === 4) return 'bg-lime-100 text-lime-800 border-lime-200'
  return 'bg-green-100 text-green-800 border-green-200'
}

export function scoreBarClass(score: number): string {
  if (score <= 1) return 'bg-red-500'
  if (score === 2) return 'bg-orange-500'
  if (score === 3) return 'bg-amber-500'
  if (score === 4) return 'bg-lime-500'
  return 'bg-green-600'
}

/** R = 5 * (1 - ((S-1)/4)) — 루브릭과 같은 0~5 대역 */
export function riskFromSafety(overallSafety: number): number {
  const risk = 5 * (1 - (overallSafety - 1) / 4)
  return normalizeRiskScore(risk)
}

/** 구 0~100 위험도를 0~5로 보정 (레거시·표시용) */
export function normalizeRiskScore(risk: number): number {
  let value = risk
  if (value > RISK_MAX) value = value / 20
  return Math.max(RISK_MIN, Math.min(RISK_MAX, Math.round(value * 100) / 100))
}

export function formatRiskScore(risk: number | null | undefined, digits = 1): string {
  if (risk == null || Number.isNaN(risk)) return '-'
  return normalizeRiskScore(risk).toFixed(digits)
}
