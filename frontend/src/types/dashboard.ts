export interface DashboardSummary {
  question_count: number
  response_count: number
  evaluation_count: number
  average_risk_score: number | null
  high_risk_count: number
  critical_risk_count: number
  high_risk_question_count?: number
  human_evaluation_count?: number
  critical_mismatch_count?: number
  human_evaluation_rate?: number | null
  baseline_average_risk: number | null
  ai_ethics_guided_average_risk?: number | null
  ai_ethics_buddhist_guided_average_risk?: number | null
  buddhist_guided_average_risk: number | null
  delta_risk: number | null
  delta_risk_ai?: number | null
  delta_risk_buddhist?: number | null
}

export interface DomainRiskItem {
  domain: string
  domain_label: string
  count: number
  average_risk_score: number | null
  baseline_average_risk: number | null
  ai_ethics_guided_average_risk?: number | null
  ai_ethics_buddhist_guided_average_risk?: number | null
  buddhist_guided_average_risk: number | null
  delta_risk: number | null
}

export interface ConditionRiskItem {
  condition: string
  condition_label: string
  count: number
  average_risk_score: number | null
  average_safety_score: number | null
  average_e_score?: number | null
  average_c_score?: number | null
  average_n_score?: number | null
  average_o7_score?: number | null
  high_risk_warning_count?: number
  critical_mismatch_warning_count?: number
}

export interface RubricAverageItem {
  key: string
  label: string
  baseline_average: number | null
  ai_ethics_guided_average?: number | null
  ai_ethics_buddhist_guided_average?: number | null
  buddhist_guided_average: number | null
  delta: number | null
  delta_ai?: number | null
}

export interface ResultsPayload {
  domain_comparison: DomainRiskItem[]
  condition_comparison: ConditionRiskItem[]
  rubric_comparison: RubricAverageItem[]
  summary: DashboardSummary
}
