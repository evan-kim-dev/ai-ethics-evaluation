import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, Link2, RefreshCw } from 'lucide-react'

import {
  createOrGetShareLink,
  fetchBaselineRatings,
  fetchShareLink,
} from '@/api/evaluations'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { BaselineRating, RatingShareLink } from '@/types/evaluation'
import { downloadOfflineRatingHtml } from '@/utils/offlineRatingExport'
import { formatDateTime } from '@/utils/format'

function absoluteShareUrl(path: string): string {
  return `${window.location.origin}${path}`
}

export function ShareLinkPanel({
  responseId,
  questionId,
  questionText,
  baselineResponse,
}: {
  responseId: number
  questionId: number
  questionText: string
  baselineResponse: string
}) {
  const [link, setLink] = useState<RatingShareLink | null>(null)
  const [ratings, setRatings] = useState<BaselineRating[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [share, list] = await Promise.all([
        fetchShareLink(responseId),
        fetchBaselineRatings(responseId),
      ])
      setLink(share)
      setRatings(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [responseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleCreate = async () => {
    setBusy(true)
    setError(null)
    try {
      const created = await createOrGetShareLink(responseId)
      setLink(created)
      setRatings(await fetchBaselineRatings(responseId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유 링크 생성에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    if (!link) return
    const url = absoluteShareUrl(link.path)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('클립보드 복사에 실패했습니다. URL을 직접 선택해 복사하세요.')
    }
  }

  const handleDownloadHtml = () => {
    downloadOfflineRatingHtml({
      questionId,
      questionText,
      baselineResponse,
    })
  }

  const avg =
    ratings.length > 0
      ? ratings.reduce((sum, item) => sum + item.star_rating, 0) / ratings.length
      : null

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-tight">다른 사람 평가</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            파일로 보내거나, 배포 후 링크로 모읍니다.
          </p>
        </div>
        {avg != null ? (
          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-right">
            <p className="text-lg font-bold text-amber-800">{avg.toFixed(2)}</p>
            <p className="text-[11px] font-medium text-amber-700">{ratings.length}명 평균</p>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-accent/5 px-4 py-3">
        <p className="text-sm font-semibold text-accent">파일로 보내기</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          HTML을 전달하면 평가자가 별점을 매기고 결과 문구를 답장합니다. 서버가 없어도 됩니다.
        </p>
        <Button type="button" className="mt-3" onClick={handleDownloadHtml}>
          <Download size={14} />
          평가용 HTML
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold">고급 · 웹 공유 링크</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              localhost 링크는 본인 PC에서만 됩니다. 배포 후에만 타인에게 유효합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            onClick={() => void refresh()}
            disabled={loading || busy}
          >
            <RefreshCw size={14} />
            새로고침
          </Button>
        </div>

        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

        {link ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={absoluteShareUrl(link.path)} className="font-mono text-xs" />
              <Button type="button" variant="secondary" onClick={() => void handleCopy()} disabled={busy}>
                <Copy size={14} />
                {copied ? '복사됨' : '복사'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              웹으로 수집된 평가 {link.rating_count}건
              {avg != null ? ` · 평균 ${avg.toFixed(2)}점` : ''}
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => void handleCreate()}
            disabled={busy || loading}
          >
            <Link2 size={14} />
            {busy ? '생성 중...' : '웹 공유 링크 만들기'}
          </Button>
        )}

        {ratings.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">평가자</th>
                  <th className="px-3 py-2 font-medium">별점</th>
                  <th className="px-3 py-2 font-medium">메모</th>
                  <th className="px-3 py-2 font-medium">업데이트</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{item.evaluator_id}</td>
                    <td className="px-3 py-2 font-semibold text-amber-700">
                      {item.star_rating.toFixed(1)}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                      {item.note || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(item.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
