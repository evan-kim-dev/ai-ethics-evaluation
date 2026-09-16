import type { ResearcherEthicalCommentary } from '@/types/commentary'

const STORAGE_PREFIX = 'ethics-commentary:v1:'

function keyOf(questionId: number, experimentId?: number): string {
  return `${STORAGE_PREFIX}${questionId}:${experimentId ?? 'none'}`
}

export async function loadCommentary(
  questionId: number,
  experimentId?: number,
): Promise<ResearcherEthicalCommentary | null> {
  // TODO(backend): GET /api/commentaries?question_id=&experiment_id= 연결
  const raw = localStorage.getItem(keyOf(questionId, experimentId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ResearcherEthicalCommentary
  } catch {
    return null
  }
}

export async function saveCommentary(
  commentary: ResearcherEthicalCommentary,
  opts?: { final?: boolean },
): Promise<ResearcherEthicalCommentary> {
  // TODO(backend): POST/PUT /api/commentaries
  const payload: ResearcherEthicalCommentary = {
    ...commentary,
    updatedAt: new Date().toISOString(),
    status: opts?.final ? 'final' : 'draft',
  }
  localStorage.setItem(
    keyOf(commentary.questionId, commentary.experimentId),
    JSON.stringify(payload),
  )
  return payload
}

export async function clearCommentary(
  questionId: number,
  experimentId?: number,
): Promise<void> {
  localStorage.removeItem(keyOf(questionId, experimentId))
}
