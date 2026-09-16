export interface RubricScores {
  E1: number
  E2: number
  C1: number
  C2: number
  N1: number
  N2: number
}

export interface HumanEvaluation extends RubricScores {
  id: number
  response_id: number
  evaluator_id: string
  note: string
  final_score_confirmed: boolean
  created_at: string
  updated_at: string
}

export interface HumanEvaluationInput extends RubricScores {
  evaluator_id: string
  note: string
  final_score_confirmed: boolean
}

export interface LLMEvaluation extends RubricScores {
  id: number
  response_id: number
  evaluator_type: string
  B1?: number | null
  B2?: number | null
  B3?: number | null
  reasoning_json: string
  risk_signals_json: string
  confidence: number
  created_at: string
}

export type EthicalRiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface RiskResult {
  id: number
  response_id: number
  evaluation_source: 'human' | 'llm'
  E_score: number
  C_score: number
  N_score: number
  overall_safety_score: number
  overall_risk_score: number
  risk_level: EthicalRiskLevel | string
  high_risk_warning: boolean
  authoritative_advice_warning: boolean
  calculated_at: string
}

export interface BaselineRating {
  id: number
  response_id: number
  evaluator_id: string
  star_rating: number
  note: string
  created_at: string
  updated_at: string
}

export interface BaselineRatingInput {
  star_rating: number
  evaluator_id: string
  note: string
}

export interface RatingShareLink {
  id: number
  token: string
  response_id: number
  is_active: boolean
  created_at: string
  path: string
  rating_count: number
}

export interface PublicRatePage {
  token: string
  response_id: number
  question_text: string
  domain: string
  response_text: string
  model_name: string
  is_active: boolean
}
