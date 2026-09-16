import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/question'
import { DOMAIN_OPTIONS } from '@/utils/constants'

interface DomainQuestionPickerProps {
  questions: Question[]
  value: number | ''
  onChange: (questionId: number) => void
  disabled?: boolean
  /** 특정 도메인 질문 일괄 실행 */
  onRunDomain?: (domain: string, questionIds: number[]) => void
  /** 개별 질문 실행 */
  onRunQuestion?: (questionId: number) => void
  runningQuestionId?: number | null
  /** true면 모든 도메인을 처음부터 펼침 */
  defaultExpandAll?: boolean
}

export function DomainQuestionPicker({
  questions,
  value,
  onChange,
  disabled = false,
  onRunDomain,
  onRunQuestion,
  runningQuestionId = null,
  defaultExpandAll = false,
}: DomainQuestionPickerProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, Question[]>()
    for (const option of DOMAIN_OPTIONS) {
      map.set(option.value, [])
    }
    for (const q of questions) {
      const list = map.get(q.domain) ?? []
      list.push(q)
      map.set(q.domain, list)
    }
    return DOMAIN_OPTIONS.map((option) => ({
      domain: option.value,
      label: option.label,
      items: map.get(option.value) ?? [],
    })).filter((group) => group.items.length > 0)
  }, [questions])

  const allDomainKeys = useMemo(() => grouped.map((g) => g.domain), [grouped])

  const selected = useMemo(
    () => questions.find((q) => q.id === value) ?? null,
    [questions, value],
  )

  const [openDomains, setOpenDomains] = useState<Set<string>>(() => new Set())
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized || grouped.length === 0) return
    if (defaultExpandAll) {
      setOpenDomains(new Set(allDomainKeys))
    } else if (selected) {
      setOpenDomains(new Set([selected.domain]))
    } else {
      setOpenDomains(new Set([grouped[0].domain]))
    }
    setInitialized(true)
  }, [initialized, grouped, allDomainKeys, defaultExpandAll, selected])

  useEffect(() => {
    if (!initialized || !selected) return
    setOpenDomains((prev) => {
      if (prev.has(selected.domain)) return prev
      const next = new Set(prev)
      next.add(selected.domain)
      return next
    })
  }, [selected, initialized])

  const toggleDomain = (domain: string) => {
    setOpenDomains((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  const expandAll = () => setOpenDomains(new Set(allDomainKeys))
  const collapseAll = () => setOpenDomains(new Set())

  if (grouped.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 질문이 없습니다.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">총 {questions.length}문항</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            disabled={disabled}
            onClick={expandAll}
          >
            전체 펼치기
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            disabled={disabled}
            onClick={collapseAll}
          >
            전체 접기
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {grouped.map((group) => {
          const open = openDomains.has(group.domain)
          const ids = group.items.map((q) => q.id)
          return (
            <div
              key={group.domain}
              className="overflow-hidden rounded-[22px] border border-border bg-white"
            >
              <div className="flex items-center gap-2 bg-muted/60 px-3.5 py-3">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleDomain(group.domain)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-sm font-bold tracking-tight">{group.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {group.items.length}
                  </span>
                </button>
                {onRunDomain ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 shrink-0 px-2.5 text-xs"
                    disabled={disabled || ids.length === 0}
                    onClick={() => onRunDomain(group.domain, ids)}
                  >
                    도메인 일괄
                  </Button>
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={open ? '접기' : '펼치기'}
                  onClick={() => toggleDomain(group.domain)}
                  className="ml-auto shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-white hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronDown
                    size={16}
                    className={cn('transition-transform duration-300', open && 'rotate-180')}
                  />
                </button>
              </div>

              {open ? (
                <div className="space-y-2 px-3 py-3">
                  {group.items.map((q) => {
                    const checked = value === q.id
                    const isRunningThis = runningQuestionId === q.id
                    return (
                      <div
                        key={q.id}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-3 py-3 transition duration-200',
                          checked
                            ? 'bg-accent/10 text-accent ring-1 ring-accent/25 shadow-sm'
                            : 'bg-muted/50 text-foreground hover:bg-muted active:scale-[0.995]',
                          disabled && !isRunningThis && 'opacity-60',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums',
                            checked ? 'bg-accent text-white' : 'bg-white text-muted-foreground',
                          )}
                        >
                          #{q.id}
                        </span>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onChange(q.id)}
                          className={cn(
                            'min-w-0 flex-1 text-left text-sm leading-relaxed disabled:cursor-not-allowed',
                            checked ? 'font-semibold text-accent' : 'text-foreground',
                          )}
                        >
                          {q.text}
                        </button>
                        {onRunQuestion ? (
                          <Button
                            type="button"
                            variant={checked ? 'primary' : 'secondary'}
                            className="h-8 shrink-0 px-2.5 text-xs"
                            disabled={disabled}
                            onClick={() => {
                              onChange(q.id)
                              onRunQuestion(q.id)
                            }}
                          >
                            {isRunningThis ? '실행 중…' : '실행'}
                          </Button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
