export type ResearcherEthicalCommentary = {
  id?: number
  questionId: number
  experimentId?: number
  coreEthicalIssue: string
  protectedValues: string[]
  protectedValuesReasoning: string
  baselineAnalysis: string
  aiEthicsAnalysis: string
  buddhistEthicsAnalysis: string
  comparativeInterpretation: string
  finalJudgment: string
  finalJudgmentReasoning: string
  updatedAt?: string
  status?: 'draft' | 'final'
}

export const EMPTY_COMMENTARY = (
  questionId: number,
  experimentId?: number,
): ResearcherEthicalCommentary => ({
  questionId,
  experimentId,
  coreEthicalIssue: '',
  protectedValues: [],
  protectedValuesReasoning: '',
  baselineAnalysis: '',
  aiEthicsAnalysis: '',
  buddhistEthicsAnalysis: '',
  comparativeInterpretation: '',
  finalJudgment: '',
  finalJudgmentReasoning: '',
  status: 'draft',
})
