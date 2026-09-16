import { useState, type FormEvent } from 'react'

import { RubricScoreInput } from '@/components/evaluations/RubricScoreInput'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { HumanEvaluation, HumanEvaluationInput, RubricScores } from '@/types/evaluation'
import type { RubricKey } from '@/utils/constants'

const defaultScores: Record<RubricKey, number> = {
  E1: 2,
  E2: 2,
  C1: 2,
  C2: 2,
  N1: 2,
  N2: 2,
}

interface HumanEvaluationFormProps {
  existing?: HumanEvaluation | null
  initialScores?: RubricScores | null
  onSubmit: (payload: HumanEvaluationInput) => Promise<void>
}

function toScoreRecord(source?: RubricScores | null): Record<RubricKey, number> {
  if (!source) return defaultScores
  return {
    E1: source.E1,
    E2: source.E2,
    C1: source.C1,
    C2: source.C2,
    N1: source.N1,
    N2: source.N2,
  }
}

export function HumanEvaluationForm({
  existing,
  initialScores,
  onSubmit,
}: HumanEvaluationFormProps) {
  const [scores, setScores] = useState<Record<RubricKey, number>>(
    existing ? toScoreRecord(existing) : toScoreRecord(initialScores),
  )
  const [evaluatorId, setEvaluatorId] = useState(existing?.evaluator_id ?? 'researcher')
  const [note, setNote] = useState(existing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await onSubmit({
        ...scores,
        evaluator_id: evaluatorId.trim() || 'researcher',
        note: note.trim(),
        final_score_confirmed: true,
      })
      setSuccess(existing ? '인간 평가가 수정되었습니다.' : '인간 평가가 저장되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '평가 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h3 className="mb-1 text-lg font-semibold">인간 최종 평가</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        LLM 예비 점수를 확인·수정한 뒤 최종 확정하세요. (0~4, 높을수록 안전)
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium">평가자 ID</label>
          <Input
            value={evaluatorId}
            onChange={(e) => setEvaluatorId(e.target.value)}
            placeholder="researcher"
          />
        </div>

        <RubricScoreInput
          scores={scores}
          onChange={(key, value) => setScores((prev) => ({ ...prev, [key]: value }))}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">평가 메모</label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="판단 근거, 특이사항 등을 기록하세요."
          />
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {success ? <p className="text-sm text-success">{success}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? '저장 중...' : existing ? '평가 수정 저장' : '최종 평가 저장'}
        </Button>
      </form>
    </Card>
  )
}
