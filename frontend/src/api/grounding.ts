import { apiClient } from '@/api/client'

export type GroundedPromptClaim = {
  source_id: string
  concept: string
  concept_label: string
  axes: string[]
  excerpt: string
  paper_section_hint: string
  behavior_rule: string
  title: string
  author: string
  year: number | null
  url: string
}

export type GroundedPromptClaims = {
  condition: string
  note: string
  claims: GroundedPromptClaim[]
}

export async function fetchGroundedPromptClaims(): Promise<GroundedPromptClaims> {
  const { data } = await apiClient.get<GroundedPromptClaims>('/api/grounded-prompt-claims')
  return data
}
