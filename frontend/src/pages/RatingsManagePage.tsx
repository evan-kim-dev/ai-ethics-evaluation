import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'

import {
  createBaselineRating,
  deleteBaselineRating,
  fetchAllBaselineRatings,
} from '@/api/evaluations'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PageTitle } from '@/components/common/PageTitle'
import { StarRatingInput } from '@/components/evaluations/StarRatingInput'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { BaselineRatingAdmin } from '@/types/evaluation'
import { formatDateTime } from '@/utils/format'

type EditDraft = {
  responseId: number
  evaluatorId: string
  starRating: number
  note: string
}

export function RatingsManagePage() {
  const [items, setItems] = useState<BaselineRatingAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [filterEvaluator, setFilterEvaluator] = useState('all')
  const [editing, setEditing] = useState<EditDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchAllBaselineRatings())
    } catch (err) {
      setItems([])
      setError(err instanceof Error ? err.message : '별점 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const evaluators = useMemo(() => {
    const names = [...new Set(items.map((item) => item.evaluator_id))].sort()
    return names
  }, [items])

  const visible = useMemo(() => {
    if (filterEvaluator === 'all') return items
    return items.filter((item) => item.evaluator_id === filterEvaluator)
  }, [items, filterEvaluator])

  const rowKey = (item: BaselineRatingAdmin) => `${item.response_id}::${item.evaluator_id}`

  const startEdit = (item: BaselineRatingAdmin) => {
    setEditing({
      responseId: item.response_id,
      evaluatorId: item.evaluator_id,
      starRating: item.star_rating,
      note: item.note ?? '',
    })
    setMessage(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await createBaselineRating(editing.responseId, {
        star_rating: editing.starRating,
        evaluator_id: editing.evaluatorId,
        note: editing.note.trim(),
      })
      setMessage(`${editing.evaluatorId} 별점을 ${editing.starRating.toFixed(1)}점으로 수정했습니다.`)
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '별점 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: BaselineRatingAdmin) => {
    if (
      !window.confirm(
        `${item.evaluator_id}의 별점(${item.star_rating.toFixed(1)})을 삭제할까요?\n응답 #${item.response_id}`,
      )
    ) {
      return
    }
    const key = rowKey(item)
    setDeletingKey(key)
    setError(null)
    setMessage(null)
    try {
      await deleteBaselineRating(item.response_id, item.evaluator_id)
      if (editing && editing.responseId === item.response_id && editing.evaluatorId === item.evaluator_id) {
        setEditing(null)
      }
      setMessage(`${item.evaluator_id} 별점을 삭제했습니다.`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '별점 삭제에 실패했습니다.')
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          title="별점 관리"
          description="공유·평가로 수집된 Baseline 별점을 확인하고 수정·삭제합니다."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={loading} onClick={() => void reload()}>
            새로고침
          </Button>
          <Link to="/review">
            <Button variant="secondary">질문 넘겨보기</Button>
          </Link>
        </div>
      </div>

      {error ? <ErrorAlert message={error} /> : null}
      {message ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      ) : null}

      <Card className="flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 space-y-1.5">
          <span className="text-sm font-semibold">평가자 필터</span>
          <Select value={filterEvaluator} onChange={(event) => setFilterEvaluator(event.target.value)}>
            <option value="all">전체 ({items.length})</option>
            {evaluators.map((name) => (
              <option key={name} value={name}>
                {name} ({items.filter((item) => item.evaluator_id === name).length})
              </option>
            ))}
          </Select>
        </label>
        <p className="pb-3 text-sm text-muted-foreground">표시 {visible.length}건</p>
      </Card>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner /> 불러오는 중...
        </p>
      ) : null}

      {!loading && visible.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">수집된 별점이 없습니다.</p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {visible.map((item) => {
          const key = rowKey(item)
          const isEditing =
            editing?.responseId === item.response_id && editing.evaluatorId === item.evaluator_id
          return (
            <Card key={key} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {item.evaluator_id} · {item.star_rating.toFixed(1)}점
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    질문 #{item.question_id ?? '-'} · 응답 #{item.response_id} ·{' '}
                    {formatDateTime(item.updated_at)}
                  </p>
                  {item.question_text ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground">
                      {item.question_text}
                    </p>
                  ) : null}
                  {item.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">메모: {item.note}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isEditing ? (
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
                    disabled={deletingKey === key || saving}
                    onClick={() => void handleDelete(item)}
                  >
                    <Trash2 size={14} />
                    {deletingKey === key ? '삭제 중...' : '삭제'}
                  </Button>
                </div>
              </div>

              {isEditing && editing ? (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-3">
                  <StarRatingInput
                    value={editing.starRating}
                    onChange={(value) => setEditing({ ...editing, starRating: value })}
                    disabled={saving}
                  />
                  <Input
                    value={editing.note}
                    onChange={(event) => setEditing({ ...editing, note: event.target.value })}
                    placeholder="메모 (선택)"
                    disabled={saving}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={saving} onClick={() => void handleSave()}>
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                    <Button variant="secondary" disabled={saving} onClick={() => setEditing(null)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
