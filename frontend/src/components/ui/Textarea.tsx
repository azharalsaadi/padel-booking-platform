import { forwardRef, useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hideLabel?: boolean
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hideLabel = false, error, helperText, id, className = '', required, rows = 4, ...props },
  ref,
) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const errorId = `${textareaId}-error`
  const helperId = `${textareaId}-helper`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={textareaId} className={cn('text-sm font-medium text-text', hideLabel && 'sr-only')}>
        {label}
        {required && <span aria-hidden="true" className="text-danger">{' '}*</span>}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={cn(error && errorId, helperText && helperId) || undefined}
        className={cn(
          'rounded-control border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted',
          'disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-sm text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  )
})
