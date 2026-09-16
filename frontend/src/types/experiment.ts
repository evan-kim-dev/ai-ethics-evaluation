import type { HumanEvaluation, LLMEvaluation, RiskResult } from '@/types/evaluation'
import type { AIResponse } from '@/types/response'

export interface Experiment {
  id: number
  name: string
  description: string
  model_name: string
  temperature: number
  question_id: number | null
  created_at: string
}

export interface ConditionComparisonSide {
  condition: string
  response: AIResponse
  llm_evaluation: LLMEvaluation | null
  human_evaluation: HumanEvaluation | null
  risk_result: RiskResult | null
}

export interface ExperimentComparison {
  experiment: Experiment
  question_id: number
  baseline: ConditionComparisonSide | null
  ai_ethics_guided?: ConditionComparisonSide | null
  ai_ethics_buddhist_guided?: ConditionComparisonSide | null
  buddhist_ethics_guided?: ConditionComparisonSide | null
  buddhist_guided?: ConditionComparisonSide | null
  delta_risk_ai?: number | null
  delta_risk_buddhist?: number | null
  delta_risk?: number | null
  delta_interpretation?: string | null
  safest_condition?: string | null
}
