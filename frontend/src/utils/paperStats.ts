import { CONDITIONS, type Condition } from '@/utils/condition'
import { round2 } from '@/utils/metrics'

export type SafetyTriple = {
  domain: string
  baselineSafety: number | null
  aiSafety: number | null
  buddhistSafety: number | null
  bestCondition?: Condition | null
}

export type DomainSafetyRow = {
  domain: string
  baseline: number | null
  ai: number | null
  buddhist: number | null
}

export type ConditionPaperStat = {
  condition: Condition
  mean: number | null
  sd: number | null
  n: number
  deltaVsBaseline: number | null
}

/** 모표준편차(÷n). 대시보드·전체 분석이 같은 식을 쓰도록 한곳에 둔다. */
export function meanAndSd(values: number[]): {
  mean: number | null
  sd: number | null
  n: number
} {
  if (values.length === 0) return { mean: null, sd: null, n: 0 }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return { mean: round2(mean), sd: round2(Math.sqrt(variance)), n: values.length }
}

export function averageOrNull(values: number[]): number | null {
  if (values.length === 0) return null
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function countBestConditions(rows: SafetyTriple[]): Record<Condition, number> {
  const counts: Record<Condition, number> = {
    baseline: 0,
    ai_ethics_guided: 0,
    ai_ethics_buddhist_guided: 0,
  }
  for (const row of rows) {
    if (row.bestCondition) counts[row.bestCondition] += 1
  }
  return counts
}

export function buildDomainSafetyRows(
  rows: SafetyTriple[],
  domains: string[],
): DomainSafetyRow[] {
  const byDomain = new Map<string, { baseline: number[]; ai: number[]; buddhist: number[] }>()
  for (const row of rows) {
    const bucket = byDomain.get(row.domain) ?? { baseline: [], ai: [], buddhist: [] }
    if (row.baselineSafety != null) bucket.baseline.push(row.baselineSafety)
    if (row.aiSafety != null) bucket.ai.push(row.aiSafety)
    if (row.buddhistSafety != null) bucket.buddhist.push(row.buddhistSafety)
    byDomain.set(row.domain, bucket)
  }
  return domains
    .filter((domain) => byDomain.has(domain))
    .map((domain) => {
      const bucket = byDomain.get(domain)!
      return {
        domain,
        baseline: averageOrNull(bucket.baseline),
        ai: averageOrNull(bucket.ai),
        buddhist: averageOrNull(bucket.buddhist),
      }
    })
}

export function buildConditionPaperStats(rows: SafetyTriple[]): ConditionPaperStat[] {
  const values: Record<Condition, number[]> = {
    baseline: [],
    ai_ethics_guided: [],
    ai_ethics_buddhist_guided: [],
  }
  for (const row of rows) {
    if (row.baselineSafety != null) values.baseline.push(row.baselineSafety)
    if (row.aiSafety != null) values.ai_ethics_guided.push(row.aiSafety)
    if (row.buddhistSafety != null) values.ai_ethics_buddhist_guided.push(row.buddhistSafety)
  }
  const baselineMean = meanAndSd(values.baseline).mean
  return CONDITIONS.map((condition) => {
    const stats = meanAndSd(values[condition])
    const deltaVsBaseline =
      condition === 'baseline' || baselineMean == null || stats.mean == null
        ? null
        : round2(stats.mean - baselineMean)
    return { condition, ...stats, deltaVsBaseline }
  })
}

export function buildDomainDeltas(
  rows: DomainSafetyRow[],
  labels: Record<string, string>,
): Array<{
  domain: string
  label: string
  deltaAi: number | null
  deltaBuddhist: number | null
}> {
  return rows.map((row) => ({
    domain: row.domain,
    label: labels[row.domain] ?? row.domain,
    deltaAi: row.baseline != null && row.ai != null ? round2(row.ai - row.baseline) : null,
    deltaBuddhist:
      row.baseline != null && row.buddhist != null ? round2(row.buddhist - row.baseline) : null,
  }))
}
