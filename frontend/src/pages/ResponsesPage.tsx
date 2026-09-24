import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'

import {
  deleteResponse,
  fetchQuestionResponses,
  updateResponse,
} from '@/api/responses'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useQuestions } from '@/hooks/useQuestions'
import type { AIResponse } from '@/types/response'
import { CONDITION_META, normalizeCondition } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'
import { formatDateTime } from '@/utils/format'

export function ResponsesPage() {
  const { questions, loading: questionsLoading, error: questionsError } = useQuestions()
  const [questionId, setQuestionId] = useState<number | ''>('')
  const [items, setItems] = useState<AIResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftText, setDraftText] = useState('')
  const [draftModel, setDraftModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const selected = useMemo(
    () => questions.find((q) => q.id === questionId) ?? null,
    [questions, questionId],
  )

  const reload = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchQuestionResponses(id)
      setItems(list.items)
    } catch (err) {
      setItems([])
      setError(err instanceof Error ? err.message : '응답 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (questionsLoading || questions.length === 0) return
    if (questionId === '') {
      setQuestionId(questions[0].id)
    }
  }, [questions, questionsLoading, questionId])

  useEffect(() => {
    if (typeof questionId !== 'number') return
    void reload(questionId)
    setEditingId(null)
    setMessage(null)
  }, [questionId, reload])

  const startEdit = (item: AIResponse) => {
    setEditingId(item.id)
    setDraftText(item.response_text)
    setDraftModel(item.model_name)
    setMessage(null)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraftText('')
    setDraftModel('')
  }

  const handleSave = async () => {
    if (editingId == null || typeof questionId !== 'number') return
    const text = draftText.trim()
    if (!text) {
      setError('응답 본문을 입력해 주세요.')
      return
    }
    if (
      !window.confirm(
        '응답을 수정하면 이 응답에 연결된 LLM 평가·위험도·Baseline 별점도 함께 지워집니다. 계속할까요?',
      )
    ) {
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateResponse(editingId, {
        response_text: text,
        model_name: draftModel.trim() || undefined,
        clear_evaluations: true,
      })
      setMessage(`응답 #${editingId}을(를) 수정했습니다. 필요하면 3조건 윤리 분석에서 다시 평가하세요.`)
      cancelEdit()
      await reload(questionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '응답 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: AIResponse) => {
    if (typeof questionId !== 'number') return
    if (
      !window.confirm(
        `응답 #${item.id}을(를) 삭제할까요?\n연결된 평가·별점도 함께 삭제됩니다.`,
      )
    ) {
      return
    }
    setDeletingId(item.id)
    setError(null)
    setMessage(null)
    try {
      await deleteResponse(item.id)
      if (editingId === item.id) cancelEdit()
      setMessage(`응답 #${item.id}을(를) 삭제했습니다.`)
      await reload(questionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '응답 삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          title="응답 관리"
          description="질문별 AI 응답 본문을 확인하고 수정·삭제합니다. 수정 시 연결된 평가 점수는 초기화됩니다."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={loading || typeof questionId !== 'number'}
            onClick={() => typeof questionId === 'number' && void reload(questionId)}
          >
            새로고침
          </Button>
          {typeof questionId === 'number' ? (
            <Link to={`/ethics-workspace?questionId=${questionId}`}>
              <Button variant="secondary">3조건 윤리 분석으로</Button>
            </Link>
          ) : null}
        </div>
      </div>

      {questionsError ? <ErrorAlert message={questionsError} /> : null}
      {error ? <ErrorAlert message={error} /> : null}
      {message ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      ) : null}

      <Card className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">질문 선택</span>
          <Select
            value={questionId === '' ? '' : String(questionId)}
            onChange={(event) => {
              const value = event.target.value
              setQuestionId(value ? Number(value) : '')
            }}
            disabled={questionsLoading || questions.length === 0}
          >
            {questions.length === 0 ? <option value="">등록된 질문이 없습니다</option> : null}
            {questions.map((question) => (
              <option key={question.id} value={question.id}>
                #{question.id} · {DOMAIN_LABELS[question.domain] ?? question.domain} ·{' '}
                {question.text.slice(0, 48)}
                {question.text.length > 48 ? '…' : ''}
              </option>
            ))}
          </Select>
        </label>
        {selected ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
            {selected.text}
          </p>
        ) : null}
      </Card>

      {loading || questionsLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner /> 불러오는 중...
        </p>
      ) : null}

      {!loading && typeof questionId === 'number' && items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            이 질문에 저장된 응답이 없습니다. 3조건 윤리 분석에서 실험을 실행해 주세요.
          </p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const condition = normalizeCondition(item.condition)
          const meta = condition ? CONDITION_META[condition] : null
          const editing = editingId === item.id
          return (
            <Card key={item.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    응답 #{item.id} · {meta?.label ?? item.condition}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.model_name} · {formatDateTime(item.created_at)}
                    {item.experiment_id != null ? ` · 실험 #${item.experiment_id}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!editing ? (
                    <Button
                      variant="secondary"
                      className="min-h-10 px-3 py-2 text-xs"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil size={14} />
                      수정
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="min-h-10 px-3 py-2 text-xs text-danger hover:bg-red-50"
                    disabled={deletingId === item.id || saving}
                    onClick={() => void handleDelete(item)}
                  >
                    <Trash2 size={14} />
                    {deletingId === item.id ? '삭제 중...' : '삭제'}
                  </Button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">모델명</span>
                    <Input
                      value={draftModel}
                      onChange={(event) => setDraftModel(event.target.value)}
                      disabled={saving}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">응답 본문</span>
                    <Textarea
                      value={draftText}
                      onChange={(event) => setDraftText(event.target.value)}
                      rows={12}
                      disabled={saving}
                      className="min-h-48 font-sans leading-relaxed"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={saving} onClick={() => void handleSave()}>
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                    <Button variant="secondary" disabled={saving} onClick={cancelEdit}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="max-h-64 overflow-auto rounded-xl bg-muted px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {item.response_text}
                </pre>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
