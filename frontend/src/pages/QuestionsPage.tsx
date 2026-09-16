import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PageTitle } from '@/components/common/PageTitle'
import { QuestionForm } from '@/components/questions/QuestionForm'
import { QuestionTable } from '@/components/questions/QuestionTable'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useQuestions } from '@/hooks/useQuestions'

export function QuestionsPage() {
  const {
    questions,
    total,
    loading,
    error,
    addQuestion,
    removeQuestion,
    runSeed,
    runResetInitial,
    reload,
  } = useQuestions()
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSeed = async () => {
    setSeeding(true)
    setActionError(null)
    setActionMessage(null)
    try {
      const message = await runSeed()
      setActionMessage(message)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '샘플 질문 불러오기에 실패했습니다.')
    } finally {
      setSeeding(false)
    }
  }

  const handleResetInitial = async () => {
    if (
      !window.confirm(
        '실험·응답·평가 데이터를 모두 삭제하고 샘플 질문만 남깁니다. 계속할까요?',
      )
    ) {
      setResetArmed(false)
      return
    }
    setResetting(true)
    setActionError(null)
    setActionMessage(null)
    try {
      const message = await runResetInitial()
      setActionMessage(message)
      setResetArmed(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '초기화에 실패했습니다.')
      setResetArmed(false)
    } finally {
      setResetting(false)
    }
  }

  const handleToggleArm = () => {
    if (resetting) return
    if (resetArmed) {
      setResetArmed(false)
      return
    }
    setResetArmed(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          title="질문 관리"
          description="실험에 사용할 질문을 등록·조회·삭제합니다. 도메인과 기대 안전 조치를 함께 관리합니다."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void reload()} disabled={loading}>
            새로고침
          </Button>
          <Button onClick={() => void handleSeed()} disabled={seeding || loading || resetting}>
            {seeding ? '불러오는 중...' : '샘플 질문 불러오기'}
          </Button>
        </div>
      </div>

      {error ? <ErrorAlert message={error} /> : null}
      {actionError ? <ErrorAlert message={actionError} /> : null}
      {actionMessage ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {actionMessage}
        </p>
      ) : null}

      <Card className="border-amber-200 bg-amber-50/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-950">초기 상태로 되돌리기</p>
            <p className="mt-1 text-xs text-amber-900/80">
              실험·응답·평가를 모두 지우고 샘플 질문만 다시 등록합니다. 토글을 켠 뒤 「초기화
              실행」을 누르세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-amber-950">
              <button
                type="button"
                role="switch"
                aria-checked={resetArmed}
                disabled={resetting}
                onClick={handleToggleArm}
                className={cn(
                  'relative h-6 w-11 rounded-full transition',
                  resetArmed ? 'bg-amber-600' : 'bg-slate-300',
                  resetting && 'opacity-60',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition',
                    resetArmed && 'translate-x-5',
                  )}
                />
              </button>
              <span>{resetArmed ? '잠금 해제됨' : '잠금'}</span>
            </div>
            <Button
              variant="secondary"
              className="border border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
              disabled={!resetArmed || resetting || loading}
              onClick={() => void handleResetInitial()}
            >
              <RotateCcw size={16} className={cn(resetting && 'animate-spin')} />
              {resetting ? '초기화 중...' : '초기화 실행'}
            </Button>
          </div>
        </div>
      </Card>

      <QuestionForm
        onSubmit={async (payload) => {
          setActionError(null)
          await addQuestion(payload)
          setActionMessage('질문이 등록되었습니다.')
        }}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">질문 목록</h2>
          <p className="text-sm text-muted-foreground">총 {total}건</p>
        </div>
        {loading && questions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner /> 불러오는 중...
          </div>
        ) : (
          <QuestionTable questions={questions} onDelete={removeQuestion} />
        )}
      </div>
    </div>
  )
}
