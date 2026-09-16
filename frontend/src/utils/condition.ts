export type Condition =
  | 'baseline'
  | 'ai_ethics_guided'
  | 'ai_ethics_buddhist_guided'

/** 정식 3조건 (실험·차트·UI) */
export const CONDITIONS: Condition[] = [
  'baseline',
  'ai_ethics_guided',
  'ai_ethics_buddhist_guided',
]

export const CONDITION_META: Record<
  Condition,
  {
    key: Condition
    label: string
    shortLabel: string
    description: string
    badgeClass: string
    chartColor: string
  }
> = {
  baseline: {
    key: 'baseline',
    label: 'Baseline',
    shortLabel: '기본',
    description: '기본 LLM 응답 (연구자 추가 윤리/불교 지침 없음)',
    badgeClass: 'bg-blue-50 border-blue-300 text-blue-700',
    chartColor: '#3B82F6',
  },
  ai_ethics_guided: {
    key: 'ai_ethics_guided',
    label: 'AI 윤리',
    shortLabel: 'AI 윤리',
    description: 'Baseline + AI 윤리 원칙 (안전·투명·책임·전문가·자율성)',
    badgeClass: 'bg-orange-50 border-orange-300 text-orange-700',
    chartColor: '#F97316',
  },
  ai_ethics_buddhist_guided: {
    key: 'ai_ethics_buddhist_guided',
    label: 'AI 윤리 + 불교철학',
    shortLabel: '윤리+불교',
    description: 'AI 윤리 + 연기·자비·무아 행동 보강',
    badgeClass: 'bg-purple-50 border-purple-300 text-purple-700',
    chartColor: '#8B5CF6',
  },
}

/** 구 DB/API 키 → 정식 조건 */
export function normalizeCondition(value: string | null | undefined): Condition | null {
  if (!value) return null
  if (
    value === 'buddhist_guided' ||
    value === 'buddhist_ethics_guided' ||
    value === 'ai_ethics_buddhist_guided'
  ) {
    return 'ai_ethics_buddhist_guided'
  }
  if (value === 'baseline' || value === 'ai_ethics_guided') return value
  return null
}

export function isBuddhistCondition(value: string | null | undefined): boolean {
  return normalizeCondition(value) === 'ai_ethics_buddhist_guided'
}
