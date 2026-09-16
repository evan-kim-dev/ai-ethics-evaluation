import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-2xl border border-transparent bg-muted px-4 py-3 text-sm outline-none transition',
        'placeholder:text-muted-foreground focus:border-accent/30 focus:bg-white focus:ring-4 focus:ring-accent/10',
        className,
      )}
      {...props}
    />
  )
}
