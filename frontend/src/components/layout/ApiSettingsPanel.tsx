import { useEffect, useMemo, useState } from 'react'
import { Check, KeyRound, Loader2 } from 'lucide-react'

import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  LLM_PROVIDER_PRESETS,
  clearRuntimeApiConfig,
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  getLlmApiKey,
  getLlmBaseUrl,
  getLlmModel,
  getLlmProvider,
  getProviderPreset,
  providerDefaults,
  setApiBaseUrl,
  setLlmApiKey,
  setLlmBaseUrl,
  setLlmModel,
  setLlmProvider,
  type LlmProviderId,
} from '@/lib/runtimeConfig'
import { cn } from '@/lib/utils'

type ApiSettingsPanelProps = {
  open: boolean
  onClose: () => void
}

export function ApiSettingsPanel({ open, onClose }: ApiSettingsPanelProps) {
  const [apiBase, setApiBase] = useState(getApiBaseUrl)
  const [provider, setProvider] = useState<LlmProviderId>(getLlmProvider)
  const [model, setModel] = useState(getLlmModel)
  const [llmBaseUrl, setLlmBase] = useState(getLlmBaseUrl)
  const [llmKey, setLlmKey] = useState(getLlmApiKey)
  const [customModel, setCustomModel] = useState('')
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const preset = useMemo(() => getProviderPreset(provider), [provider])
  const modelOptions = preset.models
  const usingCustomModel = provider === 'custom' || isCustomModel || modelOptions.length === 0

  useEffect(() => {
    if (!open) return
    const currentProvider = getLlmProvider()
    const currentModel = getLlmModel()
    setApiBase(getApiBaseUrl())
    setProvider(currentProvider)
    setModel(currentModel)
    setLlmBase(getLlmBaseUrl())
    setLlmKey(getLlmApiKey())
    const options = getProviderPreset(currentProvider).models
    const custom = currentProvider === 'custom' || options.length === 0 || !options.includes(currentModel)
    setCustomModel(custom ? currentModel : '')
    setIsCustomModel(custom)
    setMessage(null)
    setError(null)
  }, [open])

  if (!open) return null

  const persist = () => {
    const finalModel = (usingCustomModel ? customModel || model : model).trim()
    if (!finalModel) throw new Error('모델 이름을 입력하세요.')
    if (!llmBaseUrl.trim()) throw new Error('LLM Base URL을 입력하세요.')

    setApiBaseUrl(apiBase)
    setLlmProvider(provider)
    setLlmModel(finalModel)
    setLlmBaseUrl(llmBaseUrl)
    setLlmApiKey(llmKey)
    setModel(finalModel)
  }

  const handleProviderChange = (next: LlmProviderId) => {
    setProvider(next)
    const defaults = providerDefaults(next)
    if (defaults.baseUrl) setLlmBase(defaults.baseUrl)
    if (defaults.model) {
      setModel(defaults.model)
      setCustomModel('')
      setIsCustomModel(false)
    } else {
      setCustomModel('')
      setModel('')
      setIsCustomModel(true)
    }
  }

  const handleSave = () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      persist()
      setMessage('저장되었습니다. 이후 요청부터 적용됩니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setError(null)
    setMessage(null)
    try {
      persist()
      const { data } = await apiClient.get<{
        status: string
        llm_configured: boolean
        llm_configured_via_header?: boolean
        llm_model?: string
        llm_base_url?: string
      }>('/api/health')
      const viaHeader = data.llm_configured_via_header ? ' · 헤더 키' : ''
      setMessage(
        `연결됨 · LLM ${data.llm_configured ? '설정됨' : '미설정'}${viaHeader}` +
          (data.llm_model ? ` · ${data.llm_model}` : ''),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버에 연결하지 못했습니다.')
    } finally {
      setTesting(false)
    }
  }

  const handleReset = () => {
    clearRuntimeApiConfig()
    const nextProvider = getLlmProvider()
    setApiBase(getDefaultApiBaseUrl())
    setProvider(nextProvider)
    setModel(getLlmModel())
    setLlmBase(getLlmBaseUrl())
    setLlmKey('')
    setCustomModel('')
    setIsCustomModel(false)
    setMessage('기본값으로 초기화했습니다.')
    setError(null)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] sm:hidden"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-1.5rem))]',
          'animate-sheet overflow-hidden rounded-[24px] border border-border bg-white p-4',
          'shadow-[0_20px_60px_-20px_rgba(25,31,40,0.45)]',
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold tracking-tight">API · 모델 설정</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              배포·모델 비교용. 브라우저에만 저장됩니다.
            </p>
          </div>
          <KeyRound size={16} className="mt-0.5 shrink-0 text-accent" />
        </div>

        <div className="max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto pr-0.5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Backend API URL
            </label>
            <Input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder={getDefaultApiBaseUrl()}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Provider
            </label>
            <Select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as LlmProviderId)}
            >
              {LLM_PROVIDER_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Model
            </label>
            {modelOptions.length > 0 ? (
              <Select
                value={usingCustomModel ? '__custom__' : model}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '__custom__') {
                    setIsCustomModel(true)
                    setCustomModel(modelOptions.includes(model) ? '' : model)
                  } else {
                    setIsCustomModel(false)
                    setModel(value)
                    setCustomModel('')
                  }
                }}
              >
                {modelOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="__custom__">직접 입력…</option>
              </Select>
            ) : null}
            {usingCustomModel || modelOptions.length === 0 ? (
              <Input
                className={modelOptions.length > 0 ? 'mt-2' : undefined}
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="예: gemini-2.5-pro / gpt-4o / llama-3.1"
                autoComplete="off"
                spellCheck={false}
              />
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              LLM Base URL (OpenAI 호환)
            </label>
            <Input
              value={llmBaseUrl}
              onChange={(e) => setLlmBase(e.target.value)}
              placeholder={preset.baseUrl || 'https://api.example.com/v1'}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              OpenAI / Gemini / vLLM / OpenRouter 등 `/chat/completions` 호환 엔드포인트
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-muted-foreground">API Key</label>
              <button
                type="button"
                className="text-[11px] font-medium text-accent"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? '숨기기' : '보기'}
              </button>
            </div>
            <Input
              type={showKey ? 'text' : 'password'}
              value={llmKey}
              onChange={(e) => setLlmKey(e.target.value)}
              placeholder="비우면 서버 .env 키 사용"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {message ? (
            <p className="flex items-start gap-1.5 text-xs font-medium text-emerald-600">
              <Check size={14} className="mt-0.5 shrink-0" />
              {message}
            </p>
          ) : null}
          {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              저장
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => void handleTest()}
              disabled={testing}
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : null}
              연결 테스트
            </Button>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            기본값으로 초기화
          </button>
        </div>
      </div>
    </>
  )
}
