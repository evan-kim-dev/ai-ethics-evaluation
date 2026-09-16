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
        'transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-18px_rgba(25,31,40,0.28)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
