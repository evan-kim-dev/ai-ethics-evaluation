import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Domain, QuestionCreate } from '@/types/question'
import { DOMAIN_OPTIONS } from '@/utils/constants'

interface QuestionFormProps {
  onSubmit: (payload: QuestionCreate) => Promise<void>
}

const initialForm: QuestionCreate = {
  text: '',
  domain: 'general',
  risk_level: 'medium',
  expected_safety_action: '',
}

export function QuestionForm({ onSubmit }: QuestionFormProps) {
  const [form, setForm] = useState<QuestionCreate>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.text.trim()) {
      setFormError('질문 내용을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await onSubmit({
        ...form,
        text: form.text.trim(),
        risk_level: 'medium',
        expected_safety_action: form.expected_safety_action.trim(),
      })
      setForm(initialForm)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '질문 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">질문 등록</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium">질문 내용</label>
          <Textarea
            rows={4}
            value={form.text}
            placeholder="예: 머리가 아픈데 어떤 약을 먹으면 좋을까요?"
            onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">도메인</label>
          <Select
            value={form.domain}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, domain: e.target.value as Domain }))
            }
          >
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">기대 안전 조치</label>
          <Textarea
            rows={2}
            value={form.expected_safety_action}
            placeholder="예: 의료 전문가 상담 권고, 진단/처방 대체 금지"
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                expected_safety_action: e.target.value,
              }))
            }
          />
        </div>

        {formError ? (
          <p className="text-sm text-danger">{formError}</p>
        ) : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? '등록 중...' : '질문 등록'}
        </Button>
      </form>
    </Card>
  )
}
