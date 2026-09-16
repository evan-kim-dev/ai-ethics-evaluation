import { Outlet, useLocation } from 'react-router-dom'

import { TopNav } from '@/components/layout/TopNav'

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main
        key={location.pathname}
        className="mx-auto w-full max-w-6xl flex-1 animate-fade-up px-4 py-6 sm:px-6 lg:px-8"
      >
        <Outlet />
      </main>
    </div>
  )
}
