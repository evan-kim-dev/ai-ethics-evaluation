import { cn } from '@/lib/utils'

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary',
        className,
      )}
      aria-label="로딩 중"
    />
  )
}
