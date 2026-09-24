import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  BookOpen,
  ClipboardCheck,
  Columns3,
  FileQuestion,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Menu,
  MessageSquareText,
  Scale,
  X,
  type LucideIcon,
} from 'lucide-react'

import { ApiSettingsPanel } from '@/components/layout/ApiSettingsPanel'
import { clearResearcherToken, getResearcherToken } from '@/api/researcher'
import { getLlmApiKey, getLlmModel } from '@/lib/runtimeConfig'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

type NavSection = {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: '총괄',
    items: [
      { to: '/guide', label: '연구 개요', icon: BookOpen },
      { to: '/', label: '연구 대시보드', icon: LayoutDashboard },
      { to: '/results', label: '전체 분석', icon: LineChart },
    ],
  },
  {
    title: '사용자',
    items: [
      { to: '/live-chat', label: '실시간 평가', icon: MessageSquareText },
      { to: '/evaluation', label: 'Baseline 별점', icon: ClipboardCheck },
      { to: '/ethics-workspace', label: '3조건 윤리 분석', icon: Scale },
      { to: '/review', label: '질문 넘겨보기', icon: Columns3 },
    ],
  },
  {
    title: '관리',
    items: [{ to: '/questions', label: '질문 관리', icon: FileQuestion }],
  },
]

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [apiOpen, setApiOpen] = useState(false)
  const [hasLlmKey, setHasLlmKey] = useState(() => Boolean(getLlmApiKey()))
  const [modelLabel, setModelLabel] = useState(() => getLlmModel())
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen && !apiOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setApiOpen(false)
      }
    }
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
        setApiOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [menuOpen, apiOpen])

  useEffect(() => {
    if (!apiOpen) {
      setHasLlmKey(Boolean(getLlmApiKey()))
      setModelLabel(getLlmModel())
    }
  }, [apiOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link to="/" className="group min-w-0 flex-1 outline-none">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase transition group-hover:text-accent">
            Research
          </p>
          <h1 className="truncate text-[15px] font-bold tracking-tight text-foreground transition group-hover:text-accent sm:text-base">
            AI 윤리 응답 비교
          </h1>
        </Link>

        <div className="relative flex items-center gap-2" ref={panelRef}>
          <button
            type="button"
            aria-label={apiOpen ? 'API 설정 닫기' : 'API 설정 열기'}
            aria-expanded={apiOpen}
            onClick={() => {
              setApiOpen((prev) => !prev)
              setMenuOpen(false)
            }}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95',
              apiOpen
                ? 'bg-accent text-white shadow-sm ring-4 ring-accent/15'
                : hasLlmKey
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-muted text-foreground hover:bg-muted/80',
            )}
          >
            <KeyRound size={15} strokeWidth={2.25} />
            <span className="hidden max-w-[7.5rem] truncate sm:inline">
              {modelLabel ? modelLabel : 'API'}
            </span>
          </button>

          <button
            type="button"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((prev) => !prev)
              setApiOpen(false)
            }}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95',
              menuOpen
                ? 'bg-accent text-white shadow-sm ring-4 ring-accent/15'
                : 'bg-accent/10 text-accent hover:bg-accent/15',
            )}
          >
            <span className={cn('transition-transform duration-200', menuOpen && 'rotate-90')}>
              {menuOpen ? <X size={18} strokeWidth={2.25} /> : <Menu size={18} strokeWidth={2.25} />}
            </span>
          </button>

          <ApiSettingsPanel open={apiOpen} onClose={() => setApiOpen(false)} />

          {menuOpen ? (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] sm:hidden"
                onClick={() => setMenuOpen(false)}
              />
              <nav className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(19rem,calc(100vw-1.5rem))] animate-sheet overflow-hidden rounded-[24px] border border-border bg-white p-2 shadow-[0_20px_60px_-20px_rgba(25,31,40,0.45)]">
                <div className="space-y-3 p-1">
                  {navSections.map((section) => (
                    <div key={section.title}>
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold tracking-wider text-muted-foreground">
                        {section.title}
                      </p>
                      <div className="space-y-0.5">
                        {section.items.map(({ to, label, icon: Icon }) => (
                          <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition active:scale-[0.98]',
                                isActive
                                  ? 'bg-accent/10 text-accent ring-1 ring-accent/25'
                                  : 'text-foreground hover:bg-muted',
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <span
                                  className={cn(
                                    'inline-flex h-8 w-8 items-center justify-center rounded-xl transition',
                                    isActive
                                      ? 'bg-accent text-white'
                                      : 'bg-muted text-foreground',
                                  )}
                                >
                                  <Icon size={16} strokeWidth={2.25} />
                                </span>
                                <span className={cn(isActive && 'font-bold')}>{label}</span>
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  ))}
                  {getResearcherToken() ? (
                    <button
                      type="button"
                      onClick={() => {
                        clearResearcherToken()
                        window.location.assign('/')
                      }}
                      className="mt-1 w-full rounded-2xl px-3 py-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      연구자 로그아웃
                    </button>
                  ) : null}
                </div>
              </nav>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
