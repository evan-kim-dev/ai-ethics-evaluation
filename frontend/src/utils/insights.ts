import { CONDITION_META, type Condition } from '@/utils/condition'
import { axisAverages, maxKeys, overallSafetyScore } from '@/utils/metrics'
import type { ConditionExperimentResult, QuestionRiskContext } from '@/types/comparison'

export function buildExperimentInsights(
  results: ConditionExperimentResult[],
  input?: QuestionRiskContext | null,
): string[] {
  const lines: string[] = []
  const scored = results.filter(
    (r) =>
      overallSafetyScore({
        overall_safety_score: r.risk_result?.overall_safety_score,
        evaluation: r.evaluation,
        E_score: r.risk_result?.E_score,
        C_score: r.risk_result?.C_score,
        N_score: r.risk_result?.N_score,
      }) != null,
  )

  if (scored.length === 0) {
    return ['아직 분석 가능한 실험 데이터가 없습니다. 비교 실험을 실행해 주세요.']
  }

  const best = maxKeys(
    scored.map((r) => ({
      key: r.condition,
      value: overallSafetyScore({
        overall_safety_score: r.risk_result?.overall_safety_score,
        evaluation: r.evaluation,
        E_score: r.risk_result?.E_score,
        C_score: r.risk_result?.C_score,
        N_score: r.risk_result?.N_score,
      }),
    })),
  )
  if (best.length) {
    lines.push(
      `윤리 대응 점수(S)가 가장 높은 조건: ${best.map((c) => CONDITION_META[c as Condition].label).join(', ')}`,
    )
  }

  const c1Best = maxKeys(
    results.map((r) => ({ key: r.condition, value: r.evaluation?.C1 })),
  )
  const c2Best = maxKeys(
    results.map((r) => ({ key: r.condition, value: r.evaluation?.C2 })),
  )
  if (c1Best.length || c2Best.length) {
    const labels = [...new Set([...c1Best, ...c2Best])].map(
      (c) => CONDITION_META[c as Condition].label,
    )
    lines.push(`위해 예방(C1)·전문가 연결(C2)에서 강한 조건: ${labels.join(', ')}`)
  }

  const e2Best = maxKeys(
    results.map((r) => ({ key: r.condition, value: r.evaluation?.E2 })),
  )
  const n2Best = maxKeys(
    results.map((r) => ({ key: r.condition, value: r.evaluation?.N2 })),
  )
  if (e2Best.length || n2Best.length) {
    const labels = [...new Set([...e2Best, ...n2Best])].map(
      (c) => CONDITION_META[c as Condition].label,
    )
    lines.push(`맥락 고려(E2)·사용자 자율성(N2)에서 강한 조건: ${labels.join(', ')}`)
  }

  const mismatch = results.filter((r) => r.risk_result?.critical_mismatch_warning)
  if (mismatch.length) {
    lines.push(
      `Critical Mismatch 경고 발생 조건: ${mismatch
        .map((r) => CONDITION_META[r.condition].label)
        .join(', ')}`,
    )
  } else if (input && isHighInputRisk(input)) {
    lines.push('민감 도메인에서도 Critical Mismatch 경고는 관찰되지 않았습니다.')
  }

  const axes = results.map((r) => ({
    condition: r.condition,
    ...axisAverages(r.evaluation),
  }))
  const nBest = maxKeys(axes.map((a) => ({ key: a.condition, value: a.N })))
  if (nBest.length) {
    lines.push(
      `자율성 축(N) 평균이 가장 높은 조건: ${nBest
        .map((c) => CONDITION_META[c as Condition].label)
        .join(', ')}`,
    )
  }

  return lines.slice(0, 6)
}

export function buildDashboardInsights(params: {
  bestSafetyCondition?: Condition | null
  bestHarmPrevention?: Condition | null
  bestAutonomy?: Condition | null
  lowestMismatch?: Condition | null
  hasData: boolean
}): string[] {
  if (!params.hasData) {
    return [
      '아직 분석 가능한 실험 데이터가 없습니다. 질문을 등록하고 비교 실험을 실행해 주세요.',
    ]
  }
  const lines: string[] = []
  if (params.bestSafetyCondition) {
    lines.push(
      `평균 윤리 대응 점수(S)가 가장 높은 조건: ${CONDITION_META[params.bestSafetyCondition].label}`,
    )
  }
  if (params.bestHarmPrevention) {
    lines.push(
      `위해 예방(C1)·전문가 연결(C2) 점수가 높은 조건: ${CONDITION_META[params.bestHarmPrevention].label}`,
    )
  }
  if (params.bestAutonomy) {
    lines.push(
      `맥락 고려(E2)·사용자 자율성(N2) 점수가 높은 조건: ${CONDITION_META[params.bestAutonomy].label}`,
    )
  }
  if (params.lowestMismatch) {
    lines.push(
      `Critical Mismatch 비율이 낮은 조건: ${CONDITION_META[params.lowestMismatch].label}`,
    )
  }
  return lines.length
    ? lines
    : ['데이터가 부족하여 자동 요약을 생성하지 못했습니다.']
}

export function isHighInputRisk(input: QuestionRiskContext): boolean {
  return (
    input.I1_domain_risk >= 2 ||
    input.I2_harm_potential >= 2 ||
    input.I3_vulnerability_urgency >= 2
  )
}
