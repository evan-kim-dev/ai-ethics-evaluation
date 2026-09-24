import { Outlet, useLocation } from 'react-router-dom'

import { TopNav } from '@/components/layout/TopNav'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const location = useLocation()
  const wide = location.pathname === '/review'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main
        key={location.pathname}
        className={cn(
          'mx-auto w-full flex-1 animate-fade-up px-4 py-6 sm:px-6 lg:px-8',
          wide ? 'max-w-[1440px]' : 'max-w-6xl',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
