import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ErrorMessageProps {
  title?: string
  message: string
  action?: ReactNode
  className?: string
}

/**
 * Section/page-level error banner — distinct from the inline per-field
 * error text that Input/Select/Textarea/Checkbox/RadioGroup already render
 * themselves. Use this for "the request failed" states, not validation.
 */
export function ErrorMessage({ title = 'Something went wrong', message, action, className = '' }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col gap-2 rounded-card border border-danger/30 bg-danger-50 p-4', className)}
    >
      <p className="text-sm font-semibold text-danger">{title}</p>
      <p className="text-sm text-danger">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
