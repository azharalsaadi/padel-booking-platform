import { forwardRef, useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hideLabel?: boolean
  error?: string
  helperText?: string
  options: SelectOption[]
  /** Renders a disabled leading option (e.g. "Select an option"); has no `value` selected by default. */
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hideLabel = false, error, helperText, options, placeholder, id, className = '', required, ...props },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`
  const helperId = `${selectId}-helper`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className={cn('text-sm font-medium text-text', hideLabel && 'sr-only')}>
        {label}
        {required && <span aria-hidden="true" className="text-danger">{' '}*</span>}
      </label>
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={cn(error && errorId, helperText && helperId) || undefined}
        className={cn(
          'rounded-control border bg-surface px-3.5 py-2.5 text-sm text-text',
          'disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
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
