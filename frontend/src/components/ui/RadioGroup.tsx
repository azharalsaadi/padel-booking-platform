import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface RadioGroupProps {
  legend: string
  hideLegend?: boolean
  name?: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  className?: string
}

/**
 * A native radiogroup: same `name` on every <input type="radio">, which
 * gives arrow-key roving focus and single-selection semantics for free —
 * no manual keyboard handling needed.
 */
export function RadioGroup({
  legend,
  hideLegend = false,
  name,
  options,
  value,
  onChange,
  error,
  className = '',
}: RadioGroupProps) {
  const generatedName = useId()
  const groupName = name ?? generatedName
  const errorId = `${groupName}-error`

  return (
    <fieldset className={cn('flex flex-col gap-2', className)} aria-describedby={error ? errorId : undefined}>
      <legend className={cn('text-sm font-medium text-text', hideLegend && 'sr-only')}>{legend}</legend>
      {options.map((option) => {
        const optionId = `${groupName}-${option.value}`
        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className="inline-flex cursor-pointer items-start gap-2 text-sm text-text"
          >
            <input
              id={optionId}
              type="radio"
              name={groupName}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="mt-0.5 h-4 w-4 shrink-0 border-border text-primary accent-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span>
              {option.label}
              {option.description && <span className="block text-text-muted">{option.description}</span>}
            </span>
          </label>
        )
      })}
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
