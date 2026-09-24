export type Condition =
  | 'baseline'
  | 'ai_ethics_guided'
  | 'ai_ethics_buddhist_guided'
  | 'buddhist_ethics_guided'
  | 'buddhist_guided'

export interface AIResponse {
  id: number
  question_id: number
  experiment_id: number | null
  condition: Condition
  model_name: string
  system_prompt_version: string
  response_text: string
  generation_params_json: string
  created_at: string
}

export interface ResponseCreate {
  question_id: number
  condition: Condition
  response_text: string
  model_name?: string
  system_prompt_version?: string
}

export interface ResponseUpdate {
  response_text: string
  model_name?: string
  clear_evaluations?: boolean
}

export interface ResponseListResponse {
  items: AIResponse[]
  total: number
}
