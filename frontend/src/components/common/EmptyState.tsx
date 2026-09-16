import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[28px] bg-muted/70 px-6 py-14 text-center">
      <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
