import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Loader2, SendHorizontal, Sparkles } from 'lucide-react'

import { adaptExperimentComparison } from '@/api/adapters/experimentAdapter'
import { runLiveExperiment } from '@/api/experiments'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { ThreeConditionResponseComparison } from '@/components/experiment/ThreeConditionResponseComparison'
import { ThreeConditionScoreBarChart } from '@/components/charts/ThreeConditionScoreBarChart'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { ThreeConditionExperimentView } from '@/types/comparison'
import type { Question } from '@/types/question'
import { CONDITIONS } from '@/utils/condition'
import { cn } from '@/lib/utils'

type ChatItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'status'; text: string }
  | {
      id: string
      role: 'result'
      prompt: string
      view: ThreeConditionExperimentView
    }
  | { id: string; role: 'error'; text: string }

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ephemeralQuestion(text: string): Question {
  return {
    id: 0,
    text,
    domain: 'general',
    risk_level: 'medium',
    expected_safety_action: '',
    created_at: new Date().toISOString(),
  }
}

export function LiveChatEvalPage() {
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [items, setItems] = useState<ChatItem[]>([
    {
      id: 'welcome',
      role: 'status',
      text: '프롬프트를 입력하면 질문을 저장하지 않고 Baseline / AI 윤리 / AI 윤리+불교철학 3조건 생성·평가를 바로 실행합니다.',
    },
  ])
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items, running])

  useEffect(() => {
    if (!running) {
      setElapsedSec(0)
      return
    }
    const started = Date.now()
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [running])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || running) return

    setInput('')
    setRunning(true)
    setItems((prev) => [
      ...prev,
      { id: uid(), role: 'user', text },
      {
        id: uid(),
        role: 'status',
        text: '3조건 응답 생성 → LLM 평가 진행 중… (보통 1~2분, 질문은 저장되지 않습니다)',
      },
    ])

    try {
      const raw = await runLiveExperiment(text, { run_llm_judge: true })
      const view = adaptExperimentComparison(raw, ephemeralQuestion(text))
      setItems((prev) => [
        ...prev.filter((item) => item.role !== 'status' || !item.text.includes('진행 중')),
        { id: uid(), role: 'result', prompt: text, view },
      ])
    } catch (err) {
      setItems((prev) => [
        ...prev.filter((item) => item.role !== 'status' || !item.text.includes('진행 중')),
        {
          id: uid(),
          role: 'error',
          text: err instanceof Error ? err.message : '실시간 평가에 실패했습니다.',
        },
      ])
    } finally {
      setRunning(false)
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void handleSend()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[560px] flex-col gap-4">
      <div>
        <h1 className="text-[1.65rem] font-bold tracking-tight text-foreground sm:text-[1.85rem]">
          실시간 평가
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          프롬프트를 넣어 3조건 비교·윤리 대응 점수를 바로 확인합니다. 입력은 질문 목록에
          저장되지 않습니다.
        </p>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {items.map((item) => {
            if (item.role === 'user') {
              return (
                <div key={item.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-sm text-white shadow-sm">
                    <p className="whitespace-pre-wrap">{item.text}</p>
                  </div>
                </div>
              )
            }
            if (item.role === 'status') {
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900"
                >
                  <Sparkles size={16} className="mt-0.5 shrink-0" />
                  <p>{item.text}</p>
                </div>
              )
            }
            if (item.role === 'error') {
              return <ErrorAlert key={item.id} message={item.text} />
            }

            const scoreItems = CONDITIONS.map((condition) => {
              const result = item.view.results.find((r) => r.condition === condition)
              return {
                condition,
                score: result?.risk_result?.overall_safety_score ?? null,
              }
            })

            return (
              <div key={item.id} className="space-y-3 rounded-xl border border-border bg-white p-4">
                <div>
                  <p className="text-sm font-semibold">평가 결과 (저장되지 않음)</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.prompt}</p>
                </div>
                <ThreeConditionScoreBarChart items={scoreItems} />
                <ThreeConditionResponseComparison
                  results={item.view.results}
                  onGoCommentary={() => undefined}
                />
              </div>
            )
          })}

          {running ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin" size={16} />
              실행 중… 경과 {elapsedSec}초
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="border-t border-border bg-slate-50 px-4 py-3"
        >
          <div className="flex items-end gap-2">
            <Textarea
              rows={3}
              value={input}
              disabled={running}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="테스트할 프롬프트/질문을 입력하세요. Enter 전송, Shift+Enter 줄바꿈"
              className={cn('min-h-[84px] flex-1 resize-none')}
            />
            <Button type="submit" disabled={running || !input.trim()} className="h-11 px-4">
              {running ? <Loader2 className="animate-spin" size={18} /> : <SendHorizontal size={18} />}
              평가
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            입력은 질문 관리·대시보드에 남지 않으며, 이 화면의 대화로만 결과를 확인합니다.
          </p>
        </form>
      </Card>
    </div>
  )
}
