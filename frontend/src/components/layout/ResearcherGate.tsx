import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

import {
  clearResearcherToken,
  fetchResearcherStatus,
  loginResearcher,
} from '@/api/researcher'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function ResearcherGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [unlocked, setUnlocked] = useState(false)
  const [configured, setConfigured] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchResearcherStatus()
      .then((status) => {
        if (cancelled) return
        setConfigured(status.password_configured)
        setUnlocked(status.unlocked)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '연구자 로그인 상태를 확인하지 못했습니다.')
        setUnlocked(false)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!password.trim()) {
      setError('연구자 비밀번호를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await loginResearcher(password)
      setPassword('')
      setUnlocked(true)
      setConfigured(true)
    } catch (err) {
      clearResearcherToken()
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
      setUnlocked(false)
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoadingSpinner /> 연구자 접근 확인 중...
      </p>
    )
  }

  if (unlocked) return <>{children}</>

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center">
      <Card className="w-full space-y-4 p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">연구자 로그인</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            대시보드와 관리 화면은 연구자만 볼 수 있습니다. 평가자에게는 별도로 발급한 평가
            링크만 전달하세요.
          </p>
        </div>
        {!configured ? (
          <ErrorAlert message="서버에 RESEARCHER_PASSWORD가 없습니다. 관리 화면을 잠그려면 비밀번호를 설정하세요." />
        ) : (
          <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="연구자 비밀번호"
              aria-label="연구자 비밀번호"
              autoComplete="current-password"
              autoFocus
            />
            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? '확인 중...' : '관리 화면 열기'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
