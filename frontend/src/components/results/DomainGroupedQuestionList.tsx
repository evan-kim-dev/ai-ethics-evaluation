import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Eye, Trash2 } from 'lucide-react'

import type { QuestionExperimentSummary } from '@/hooks/useQuestionExperimentSummaries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/question'
import { CONDITION_META, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS, DOMAIN_OPTIONS } from '@/utils/constants'
import { maxKeys } from '@/utils/metrics'
import { formatDelta, interpretDelta } from '@/utils/risk'

type DomainQuestionItem = {
  question: Question
  summary: QuestionExperimentSummary | null
}

export function DomainGroupedQuestionList({
  questions,
  summaries,
  onDelete,
  deletingId,
}: {
  questions: Question[]
  summaries: QuestionExperimentSummary[]
  onDelete: (questionId: number) => Promise<void>
  deletingId?: number | null
}) {
  const summaryById = useMemo(() => {
    const map = new Map<number, QuestionExperimentSummary>()
    for (const row of summaries) map.set(row.questionId, row)
    return map
  }, [summaries])

  const groups = useMemo(() => {
    const byDomain = new Map<string, DomainQuestionItem[]>()
    for (const question of questions) {
      const list = byDomain.get(question.domain) ?? []
      list.push({
        question,
        summary: summaryById.get(question.id) ?? null,
      })
      byDomain.set(question.domain, list)
    }

    const orderedKeys = [
      ...DOMAIN_OPTIONS.map((d) => d.value),
      ...[...byDomain.keys()].filter((k) => !DOMAIN_OPTIONS.some((d) => d.value === k)),
    ]

    return orderedKeys
      .filter((domain) => (byDomain.get(domain)?.length ?? 0) > 0)
      .map((domain) => {
        const items = (byDomain.get(domain) ?? []).sort((a, b) => b.question.id - a.question.id)
        return {
          domain,
          label: DOMAIN_LABELS[domain] ?? domain,
          items,
          analyzedCount: items.filter((i) => i.summary != null).length,
        }
      })
  }, [questions, summaryById])

  const [openDomains, setOpenDomains] = useState<Set<string> | null>(null)
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null)

  const effectiveOpen = openDomains ?? new Set(groups.map((g) => g.domain))

  const toggleDomain = (domain: string) => {
    setOpenDomains((prev) => {
      const base = prev ?? new Set(groups.map((g) => g.domain))
      const next = new Set(base)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  const handleDelete = async (questionId: number, preview: string) => {
    const short = preview.length > 40 ? `${preview.slice(0, 40)}…` : preview
    if (!window.confirm(`이 질문을 삭제할까요?\n\n「${short}」\n\n관련 실험·응답·평가도 함께 삭제될 수 있습니다.`)) {
      return
    }
    await onDelete(questionId)
    if (openQuestionId === questionId) setOpenQuestionId(null)
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        표시할 질문이 없습니다. 질문을 등록하거나 필터를 바꿔 보세요.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const open = effectiveOpen.has(group.domain)
        return (
          <div key={group.domain} className="overflow-hidden rounded-xl border border-border">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 bg-muted/60 px-4 py-3 text-left hover:bg-muted"
              onClick={() => toggleDomain(group.domain)}
              aria-expanded={open}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <ChevronDown
                  size={18}
                  className={cn(
                    'shrink-0 text-muted-foreground transition-transform',
                    open && 'rotate-180',
                  )}
                />
                <span className="text-base font-semibold">{group.label}</span>
                <Badge className="border-slate-300 bg-white text-slate-700">
                  질문 {group.items.length}
                </Badge>
                <Badge className="border-indigo-200 bg-indigo-50 text-indigo-800">
                  실험 결과 {group.analyzedCount}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{group.domain}</span>
            </button>

            {open ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white text-muted-foreground">
                    <tr>
                      <th className="w-8 px-3 py-2" />
                      <th className="px-3 py-2">질문</th>
                                            <th className="px-3 py-2">Baseline S</th>
                      <th className="px-3 py-2">AI 윤리 S</th>
                      <th className="px-3 py-2">윤리+불교 S</th>
                      <th className="px-3 py-2">최고 점수</th>
                      <th className="px-3 py-2">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map(({ question, summary }) => {
                      const expanded = openQuestionId === question.id
                      const winners = summary
                        ? (maxKeys([
                            { key: 'baseline', value: summary.baselineSafety },
                            { key: 'ai_ethics_guided', value: summary.aiSafety },
                            {
                              key: 'ai_ethics_buddhist_guided',
                              value: summary.buddhistSafety,
                            },
                          ]) as Condition[])
                        : []
                      return (
                        <Fragment key={question.id}>
                          <tr
                            className={cn(
                              'border-t border-border align-top transition',
                              summary ? 'cursor-pointer hover:bg-muted/40' : '',
                              expanded && 'bg-blue-50/40',
                            )}
                            onClick={() => {
                              if (!summary) return
                              setOpenQuestionId(expanded ? null : question.id)
                            }}
                          >
                            <td className="px-3 py-3">
                              {summary ? (
                                <ChevronDown
                                  size={16}
                                  className={cn(
                                    'text-muted-foreground transition-transform',
                                    expanded && 'rotate-180',
                                  )}
                                />
                              ) : (
                                <span className="text-muted-foreground">·</span>
                              )}
                            </td>
                            <td className="max-w-sm px-3 py-3">
                              <p className="line-clamp-2 font-medium text-slate-800">
                                {question.text}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Q#{question.id}
                                {summary ? ` · 실험 #${summary.experimentId}` : ' · 실험 결과 없음'}
                              </p>
                            </td>
                            <td className="px-3 py-3">{fmt(summary?.baselineSafety ?? null)}</td>
                            <td className="px-3 py-3">{fmt(summary?.aiSafety ?? null)}</td>
                            <td className="px-3 py-3">{fmt(summary?.buddhistSafety ?? null)}</td>
                            <td className="px-3 py-3 text-xs">
                              {winners.length
                                ? winners.map((c) => CONDITION_META[c].shortLabel).join(', ')
                                : '-'}
                            </td>
                            <td
                              className="px-3 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-wrap gap-1">
                                <Link to={`/ethics-workspace?questionId=${question.id}`}>
                                  <Button variant="secondary" className="h-8 px-2">
                                    <Eye size={14} />
                                    보기
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  className="h-8 px-2 text-red-700 hover:bg-red-50"
                                  disabled={deletingId === question.id}
                                  onClick={() => void handleDelete(question.id, question.text)}
                                >
                                  <Trash2 size={14} />
                                  {deletingId === question.id ? '삭제 중…' : '삭제'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {expanded && summary ? (
                            <tr className="border-t border-border bg-slate-50">
                              <td colSpan={8} className="px-4 py-4">
                                <QuestionDetailPanel row={summary} />
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function QuestionDetailPanel({ row }: { row: QuestionExperimentSummary }) {
  const sides = [
    { key: 'baseline' as const, side: row.comparison.baseline },
    { key: 'ai_ethics_guided' as const, side: row.comparison.ai_ethics_guided },
    {
      key: 'ai_ethics_buddhist_guided' as const,
      side: row.comparison.ai_ethics_buddhist_guided ?? row.comparison.buddhist_guided,
    },
  ]

  const aiInterp = interpretDelta(row.deltaAi)
  const budInterp = interpretDelta(row.deltaBuddhist)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-slate-200 bg-white">
          평가:{' '}
          {row.evaluationSource === 'human'
            ? '인간 최종'
            : row.evaluationSource === 'llm'
              ? 'LLM 예비'
              : '미평가'}
        </Badge>
        <Badge className="border-slate-200 bg-white">경고 합계 {row.warningCount}</Badge>
        {row.bestCondition ? (
          <Badge className="border-green-200 bg-green-50 text-green-800">
            최고 점수: {CONDITION_META[row.bestCondition].label}
          </Badge>
        ) : null}
        <span className={`text-sm ${aiInterp.className}`}>
          ΔS AI 윤리 {formatDelta(row.deltaAi)} ({aiInterp.label})
        </span>
        <span className={`text-sm ${budInterp.className}`}>
          ΔS 윤리+불교 {formatDelta(row.deltaBuddhist)} ({budInterp.label})
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {sides.map(({ key, side }) => {
          const meta = CONDITION_META[key]
          const risk = side?.risk_result
          const text = side?.response.response_text ?? ''
          return (
            <div
              key={key}
              className={cn('rounded-lg border-2 bg-white p-3', meta.badgeClass)}
            >
              <p className="font-semibold">{meta.label}</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: meta.chartColor }}>
                {risk?.overall_safety_score?.toFixed(2) ?? '-'}
                <span className="ml-1 text-xs font-normal text-muted-foreground">/5 · S</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                E {risk ? risk.E_score.toFixed(2) : '-'} · C{' '}
                {risk ? risk.C_score.toFixed(2) : '-'} · N {risk ? risk.N_score.toFixed(2) : '-'}
              </p>
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                {text || '응답 없음'}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to={`/ethics-workspace?questionId=${row.questionId}`}>
          <Button>윤리 분석 워크스페이스에서 보기</Button>
        </Link>
      </div>
    </div>
  )
}

function fmt(value: number | null): string {
  return value == null ? '-' : value.toFixed(2)
}
