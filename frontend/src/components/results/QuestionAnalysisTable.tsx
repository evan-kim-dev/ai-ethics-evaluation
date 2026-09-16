import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

import type { QuestionExperimentSummary } from '@/hooks/useQuestionExperimentSummaries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CONDITION_META, type Condition } from '@/utils/condition'
import { DOMAIN_LABELS } from '@/utils/constants'
import { formatDelta, interpretDelta } from '@/utils/risk'
import { maxKeys } from '@/utils/metrics'

export function QuestionAnalysisTable({ rows }: { rows: QuestionExperimentSummary[] }) {
  const [openId, setOpenId] = useState<number | null>(null)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 실험 결과가 있는 질문이 없습니다. 윤리 분석에서 비교 실험을 실행해 주세요.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="w-8 px-3 py-2" />
            <th className="px-3 py-2">질문</th>
            <th className="px-3 py-2">도메인</th>
                        <th className="px-3 py-2">Baseline S</th>
            <th className="px-3 py-2">AI 윤리 S</th>
            <th className="px-3 py-2">윤리+불교 S</th>
            <th className="px-3 py-2">최고 점수</th>
            <th className="px-3 py-2">상세</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = openId === row.questionId
            const winners = maxKeys([
              { key: 'baseline', value: row.baselineSafety },
              { key: 'ai_ethics_guided', value: row.aiSafety },
              { key: 'ai_ethics_buddhist_guided', value: row.buddhistSafety },
            ]) as Condition[]
            return (
              <Fragment key={row.questionId}>
                <tr
                  className={cn(
                    'cursor-pointer border-t border-border align-top transition hover:bg-muted/50',
                    open && 'bg-blue-50/40',
                  )}
                  onClick={() => setOpenId(open ? null : row.questionId)}
                >
                  <td className="px-3 py-3">
                    <ChevronDown
                      size={16}
                      className={cn(
                        'text-muted-foreground transition-transform',
                        open && 'rotate-180',
                      )}
                    />
                  </td>
                  <td className="max-w-sm px-3 py-3">
                    <p className="line-clamp-2 font-medium text-slate-800">{row.questionText}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Q#{row.questionId} · 실험 #{row.experimentId}
                    </p>
                  </td>
                  <td className="px-3 py-3">{DOMAIN_LABELS[row.domain] ?? row.domain}</td>
                  <td className="px-3 py-3">{fmt(row.baselineSafety)}</td>
                  <td className="px-3 py-3">{fmt(row.aiSafety)}</td>
                  <td className="px-3 py-3">{fmt(row.buddhistSafety)}</td>
                  <td className="px-3 py-3 text-xs">
                    {winners.length
                      ? winners.map((c) => CONDITION_META[c].shortLabel).join(', ')
                      : '-'}
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/ethics-workspace?questionId=${row.questionId}`}>
                      <Button variant="secondary" className="whitespace-nowrap">
                        전체 보기
                      </Button>
                    </Link>
                  </td>
                </tr>
                {open ? (
                  <tr className="border-t border-border bg-slate-50">
                    <td colSpan={9} className="px-4 py-4">
                      <QuestionDetailPanel row={row} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
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
        <Link to={`/experiment?questionId=${row.questionId}`}>
          <Button variant="secondary">3조건 비교로 이동</Button>
        </Link>
      </div>
    </div>
  )
}

function fmt(value: number | null): string {
  return value == null ? '-' : value.toFixed(2)
}
