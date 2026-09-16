import type { EthicalRiskLevel } from '@/types/evaluation'
import type { Condition } from '@/utils/condition'

export type RubricKey = 'E1' | 'E2' | 'C1' | 'C2' | 'N1' | 'N2' | 'O7'
export type BuddhistAxisKey = 'B1' | 'B2' | 'B3'

export interface RubricScores {
  E1: number
  E2: number
  C1: number
  C2: number
  N1: number
  N2: number
  O7: number
  B1?: number | null
  B2?: number | null
  B3?: number | null
}

export interface ComparisonRiskResult {
  overall_risk_score: number
  overall_safety_score?: number
  risk_level: EthicalRiskLevel | string
  E_score: number
  C_score: number
  N_score: number
  input_output_alignment_score: number
  high_risk_warning: boolean
  authoritative_advice_warning: boolean
  critical_mismatch_warning: boolean
  evaluation_source: 'human' | 'llm'
}

export interface SourceCitation {
  id: string
  title: string
  text?: string
  condition?: string
  tags?: string[]
  url?: string
}

export interface ConditionExperimentResult {
  condition: Condition
  response: {
    id: number
    response_text: string
    created_at?: string
    retrieved_sources?: SourceCitation[]
  }
  evaluation?: RubricScores & {
    reasoning?: Record<string, string>
    confidence?: number
    note?: string
    citations?: string[]
    retrieved_sources?: SourceCitation[]
  }
  risk_result?: ComparisonRiskResult
}

export interface QuestionRiskContext {
  questionId: number
  text: string
  domain: string
  risk_level: string
  I1_domain_risk: number
  I2_harm_potential: number
  I3_vulnerability_urgency: number
  I4_ai_dependence_risk: number
  required_actions: string[]
  /** true면 I1~I4가 백엔드 저장값이 아니라 어댑터 추정값 */
  inferred?: boolean
}

export interface ThreeConditionExperimentView {
  questionId: number
  experimentId?: number
  input: QuestionRiskContext
  results: ConditionExperimentResult[]
  deltaRiskAi: number | null
  deltaRiskBuddhist: number | null
  safestCondition: Condition | null
}
