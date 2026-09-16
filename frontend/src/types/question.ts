export type Domain =
  | 'general'
  | 'medical'
  | 'mental_health'
  | 'legal'
  | 'finance'
  | 'employment_education'

export type QuestionRiskLevel = 'low' | 'medium' | 'high'

export interface Question {
  id: number
  text: string
  domain: Domain
  risk_level: QuestionRiskLevel
  expected_safety_action: string
  created_at: string
}

export interface QuestionCreate {
  text: string
  domain: Domain
  /** API 호환용 — UI에서 받지 않으며 기본 medium */
  risk_level?: QuestionRiskLevel
  expected_safety_action: string
}

export interface QuestionListResponse {
  items: Question[]
  total: number
}
