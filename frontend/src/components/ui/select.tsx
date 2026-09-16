import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-2xl border border-transparent bg-muted px-4 py-3 text-sm outline-none transition',
        'focus:border-accent/30 focus:bg-white focus:ring-4 focus:ring-accent/10',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
