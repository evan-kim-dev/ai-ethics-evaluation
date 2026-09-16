export type LlmProviderId = 'gemini' | 'openai' | 'custom'

export type LlmProviderPreset = {
  id: LlmProviderId
  label: string
  baseUrl: string
  models: string[]
}

export const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: [
      'gemini-3.1-pro-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI 호환)',
    baseUrl: '',
    models: [],
  },
]

const API_BASE_KEY = 'runtime_api_base_url'
const LLM_API_KEY = 'runtime_llm_api_key'
const LLM_PROVIDER_KEY = 'runtime_llm_provider'
const LLM_MODEL_KEY = 'runtime_llm_model'
const LLM_BASE_URL_KEY = 'runtime_llm_base_url'

const DEFAULT_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  'http://localhost:8000'

const DEFAULT_PROVIDER: LlmProviderId = 'gemini'
const DEFAULT_MODEL = LLM_PROVIDER_PRESETS[0].models[0]

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() ?? ''
  } catch {
    return ''
  }
}

function writeStorage(key: string, value: string): void {
  try {
    const cleaned = value.trim()
    if (!cleaned) localStorage.removeItem(key)
    else localStorage.setItem(key, cleaned)
  } catch {
    /* ignore quota / private mode */
  }
}

export function getProviderPreset(id: string): LlmProviderPreset {
  return LLM_PROVIDER_PRESETS.find((item) => item.id === id) ?? LLM_PROVIDER_PRESETS[0]
}

export function getDefaultApiBaseUrl(): string {
  return DEFAULT_API_BASE
}

export function getApiBaseUrl(): string {
  return readStorage(API_BASE_KEY) || DEFAULT_API_BASE
}

export function setApiBaseUrl(url: string): void {
  writeStorage(API_BASE_KEY, url.replace(/\/$/, ''))
}

export function getLlmApiKey(): string {
  return readStorage(LLM_API_KEY)
}

export function setLlmApiKey(key: string): void {
  writeStorage(LLM_API_KEY, key)
}

export function getLlmProvider(): LlmProviderId {
  const raw = readStorage(LLM_PROVIDER_KEY)
  if (raw === 'openai' || raw === 'custom' || raw === 'gemini') return raw
  return DEFAULT_PROVIDER
}

export function setLlmProvider(provider: LlmProviderId): void {
  writeStorage(LLM_PROVIDER_KEY, provider)
}

export function getLlmModel(): string {
  return readStorage(LLM_MODEL_KEY) || DEFAULT_MODEL
}

export function setLlmModel(model: string): void {
  writeStorage(LLM_MODEL_KEY, model)
}

export function getLlmBaseUrl(): string {
  const stored = readStorage(LLM_BASE_URL_KEY)
  if (stored) return stored
  return getProviderPreset(getLlmProvider()).baseUrl
}

export function setLlmBaseUrl(url: string): void {
  writeStorage(LLM_BASE_URL_KEY, url.replace(/\/$/, ''))
}

export function providerDefaults(provider: LlmProviderId): {
  baseUrl: string
  model: string
} {
  const preset = getProviderPreset(provider)
  return {
    baseUrl: preset.baseUrl,
    model: preset.models[0] || '',
  }
}

export function clearRuntimeApiConfig(): void {
  writeStorage(API_BASE_KEY, '')
  writeStorage(LLM_API_KEY, '')
  writeStorage(LLM_PROVIDER_KEY, '')
  writeStorage(LLM_MODEL_KEY, '')
  writeStorage(LLM_BASE_URL_KEY, '')
}

export function maskApiKey(key: string): string {
  const cleaned = key.trim()
  if (cleaned.length <= 8) return cleaned ? '••••••••' : ''
  return `${cleaned.slice(0, 4)}…${cleaned.slice(-4)}`
}
