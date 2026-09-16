import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-sm hover:bg-[#1b6ef3] active:bg-[#1558d6]',
  secondary: 'bg-accent/10 text-accent hover:bg-accent/15',
  danger: 'bg-danger text-white hover:bg-red-500 shadow-sm',
  ghost: 'bg-transparent text-foreground hover:bg-accent/10 hover:text-accent',
}

export function Button({
  children,
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold tracking-tight transition duration-200',
        'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:active:scale-100',
        variantClass[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
