import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Hides the visible <label> text while keeping it available to screen readers. */
  hideLabel?: boolean
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel = false, error, helperText, id, className = '', required, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={cn('text-sm font-medium text-text', hideLabel && 'sr-only')}>
        {label}
        {required && <span aria-hidden="true" className="text-danger">{' '}*</span>}
      </label>
      <input
        ref={ref}
        id={inputId}
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
