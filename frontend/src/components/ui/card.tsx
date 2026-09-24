import type { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(25,31,40,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
