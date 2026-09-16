import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, SendHorizontal, Sparkles, Trash2 } from 'lucide-react'

import { ErrorAlert } from '@/components/common/ErrorAlert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Domain, Question, QuestionCreate } from '@/types/question'
import {
  DOMAIN_LABELS,
  DOMAIN_OPTIONS,
} from '@/utils/constants'
import { formatDateTime } from '@/utils/format'

type DraftStep = 'idle' | 'domain' | 'safety' | 'saving'

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  questionId?: number
  createdAt?: string
}

interface QuestionChatPanelProps {
  questions: Question[]
  loading: boolean
  error: string | null
  onAdd: (payload: QuestionCreate) => Promise<Question>
  onDelete: (id: number) => Promise<void>
  onSeed: () => Promise<string>
  onReload: () => Promise<void>
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function buildHistory(questions: Question[]): ChatMessage[] {
  const sorted = [...questions].sort((a, b) => a.id - b.id)
  const history: ChatMessage[] = []
  for (const q of sorted) {
    history.push({
      id: `hist-user-${q.id}`,
      role: 'user',
      text: q.text,
      questionId: q.id,
      createdAt: q.created_at,
    })
    history.push({
      id: `hist-bot-${q.id}`,
      role: 'assistant',
      text: `질문을 등록해 두었어요.\n분야: ${DOMAIN_LABELS[q.domain] ?? q.domain}${q.expected_safety_action ? `\n기대 안전 조치: ${q.expected_safety_action}` : ''}`,
      questionId: q.id,
      createdAt: q.created_at,
    })
  }
  return history
}

export function QuestionChatPanel({
  questions,
  loading,
  error,
  onAdd,
  onDelete,
  onSeed,
  onReload,
}: QuestionChatPanelProps) {
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState<DraftStep>('idle')
  const [draftText, setDraftText] = useState('')
  const [draftDomain, setDraftDomain] = useState<Domain | null>(null)
  const [seedLoading, setSeedLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const historyMessages = useMemo(() => buildHistory(questions), [questions])

  const welcomeMessages = useMemo<ChatMessage[]>(
    () => [
      {
        id: 'welcome-1',
        role: 'assistant',
        text: '안녕하세요. 연구용 질문 등록 챗봇입니다.\n평가하고 싶은 질문을 입력해 주세요. 분야는 이어서 선택합니다.',
      },
      {
        id: 'welcome-2',
        role: 'assistant',
        text:
          questions.length === 0
            ? '아직 등록된 질문이 없어요. 바로 입력하거나 샘플 질문을 불러올 수 있어요.'
            : `현재 ${questions.length}개 질문이 등록되어 있어요. 새 질문을 이어서 입력해 주세요.`,
      },
    ],
    [questions.length],
  )

  const messages = useMemo(
    () => [...welcomeMessages, ...historyMessages, ...sessionMessages],
    [welcomeMessages, historyMessages, sessionMessages],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, step])

  const pushSession = (...next: ChatMessage[]) => {
    setSessionMessages((prev) => [...prev, ...next])
  }

  const resetDraft = () => {
    setStep('idle')
    setDraftText('')
    setDraftDomain(null)
    setInput('')
  }

  const startFromText = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setLocalError(null)
    setDraftText(trimmed)
    setStep('domain')
    pushSession(
      { id: uid('u'), role: 'user', text: trimmed },
      {
        id: uid('a'),
        role: 'assistant',
        text: '좋아요. 이 질문의 분야(도메인)를 선택해 주세요.',
      },
    )
    setInput('')
  }

  const handleSend = (event?: FormEvent) => {
    event?.preventDefault()
    if (step === 'saving') return
    if (step === 'idle') {
      startFromText(input)
      return
    }
    if (step === 'safety') {
      void finalize(input.trim())
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const selectDomain = (domain: Domain) => {
    if (step !== 'domain') return
    setDraftDomain(domain)
    setStep('safety')
    pushSession(
      { id: uid('u'), role: 'user', text: DOMAIN_LABELS[domain] ?? domain },
      {
        id: uid('a'),
        role: 'assistant',
        text: `분야를 "${DOMAIN_LABELS[domain]}"(으)로 골랐어요. 기대하는 안전 조치가 있으면 입력하고, 없으면 "건너뛰기"를 눌러 주세요.`,
      },
    )
  }

  const finalize = async (safetyAction: string) => {
    if (!draftDomain || !draftText) return
    setStep('saving')
    setLocalError(null)
    pushSession({
      id: uid('u'),
      role: 'user',
      text: safetyAction ? safetyAction : '건너뛰기',
    })

    try {
      const created = await onAdd({
        text: draftText,
        domain: draftDomain,
        risk_level: 'medium',
        expected_safety_action: safetyAction,
      })
      // 히스토리에 반영되므로 이번 세션 안내만 남기고 초안 초기화
      setSessionMessages([
        {
          id: uid('a'),
          role: 'assistant',
          text: `등록 완료! (#${created.id})\n평가 페이지에서 바로 이어서 실험할 수 있어요.`,
          questionId: created.id,
        },
      ])
      resetDraft()
    } catch (err) {
      const message = err instanceof Error ? err.message : '질문 등록에 실패했습니다.'
      setLocalError(message)
      pushSession({
        id: uid('a'),
        role: 'assistant',
        text: `등록에 실패했어요: ${message}\n다시 질문을 입력해 주세요.`,
      })
      resetDraft()
    }
  }

  const handleSeed = async () => {
    setSeedLoading(true)
    setLocalError(null)
    try {
      const message = await onSeed()
      setSessionMessages([
        {
          id: uid('a'),
          role: 'assistant',
          text: message,
        },
      ])
      resetDraft()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '샘플 불러오기에 실패했습니다.')
    } finally {
      setSeedLoading(false)
    }
  }

  const handleDelete = async (questionId: number) => {
    if (!window.confirm(`질문 #${questionId}을(를) 삭제할까요?`)) return
    await onDelete(questionId)
    setSessionMessages((prev) => [
      ...prev,
      {
        id: uid('a'),
        role: 'assistant',
        text: `질문 #${questionId}을(를) 삭제했어요.`,
      },
    ])
  }

  const placeholder =
    step === 'idle'
      ? '연구용 질문을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)'
      : step === 'safety'
        ? '기대 안전 조치를 입력하거나 건너뛰기를 누르세요'
        : '아래 선택지를 눌러 주세요'

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h1 className="text-base font-semibold">질문 등록 챗봇</h1>
          <p className="text-xs text-muted-foreground">
            대화처럼 질문을 등록합니다 · 총 {questions.length}개
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="h-8 px-2.5 text-xs"
            onClick={() => void onReload()}
          >
            새로고침
          </Button>
          <Button
            variant="secondary"
            className="h-8 px-2.5 text-xs"
            onClick={() => void handleSeed()}
            disabled={seedLoading}
          >
            <Sparkles size={14} />
            {seedLoading ? '불러오는 중' : '샘플 불러오기'}
          </Button>
        </div>
      </div>

      {(error || localError) && (
        <div className="border-b border-border px-4 py-2">
          <ErrorAlert message={error || localError || ''} />
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100/80 px-4 py-4">
        {loading && historyMessages.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
            대화 불러오는 중...
          </div>
        ) : null}

        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            onDelete={
              message.role === 'assistant' && message.questionId
                ? () => handleDelete(message.questionId!)
                : undefined
            }
          />
        ))}

        {step === 'domain' ? (
          <ChoiceRow
            label="분야 선택"
            options={DOMAIN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onSelect={(value) => selectDomain(value as Domain)}
          />
        ) : null}

        {step === 'safety' ? (
          <div className="flex justify-start">
            <Button variant="secondary" onClick={() => void finalize('')}>
              건너뛰기
            </Button>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-border bg-white p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-slate-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-blue-100">
          <textarea
            rows={1}
            value={input}
            disabled={step === 'domain' || step === 'saving'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2 text-sm outline-none disabled:opacity-60"
          />
          <Button
            type="submit"
            className="mb-0.5 h-10 w-10 shrink-0 rounded-full p-0"
            disabled={
              step === 'domain' ||
              step === 'saving' ||
              (step === 'idle' && !input.trim()) ||
              (step === 'safety' && false)
            }
          >
            {step === 'saving' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <SendHorizontal size={16} />
            )}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {step === 'idle' && '질문을 보내면 분야 → 안전 조치 순으로 안내합니다.'}
          {step === 'domain' && '분야 칩을 선택해 주세요.'}
          {step === 'safety' && '안전 조치를 입력하거나 건너뛰기를 누르세요.'}
          {step === 'saving' && '질문을 저장하는 중...'}
        </p>
      </form>
    </div>
  )
}

function ChatBubble({
  message,
  onDelete,
}: {
  message: ChatMessage
  onDelete?: () => void
}) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[min(85%,42rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-border bg-white text-slate-800',
        )}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.questionId && message.role === 'assistant' ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-2">
            <span className="text-[11px] text-muted-foreground">#{message.questionId}</span>
            {message.createdAt ? (
              <span className="text-[11px] text-muted-foreground">
                {formatDateTime(message.createdAt)}
              </span>
            ) : null}
            <Link
              to="/evaluation"
              className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
            >
              평가하러 가기
            </Link>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1 text-[11px] text-danger hover:opacity-80"
              >
                <Trash2 size={12} />
                삭제
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ChoiceRow({
  label,
  options,
  onSelect,
}: {
  label: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 p-3 shadow-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="rounded-full border border-border bg-slate-50 px-3 py-1.5 text-sm transition hover:border-primary hover:bg-blue-50 hover:text-primary"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
