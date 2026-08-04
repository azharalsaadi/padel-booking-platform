import { useId } from 'react'
import { CreditCard, MapPin } from 'lucide-react'
import type { PaymentMethod } from '@/types/api'
import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

interface PaymentMethodSelectorProps {
  value: PaymentMethod | ''
  onChange: (value: PaymentMethod) => void
  error?: string
}

const OPTIONS: Array<{
  value: PaymentMethod
  label: string
  description: string
  icon: typeof CreditCard
  badges?: Array<{ label: string; variant: BadgeVariant }>
}> = [
  {
    value: 'thawani',
    label: 'Pay Online with Thawani',
    description: 'Secure online payment. Your selected slots are held temporarily until payment completes.',
    icon: CreditCard,
    badges: [
      { label: 'Recommended', variant: 'success' },
      { label: 'Secure', variant: 'neutral' },
    ],
  },
  {
    value: 'pay_at_venue',
    label: 'Pay at Venue',
    description: 'Pay when you arrive. No online checkout is opened.',
    icon: MapPin,
  },
]

/**
 * Renders the same two payment methods as a native radiogroup, styled as
 * selectable cards. Built directly on native radio inputs rather than the
 * shared RadioGroup component — RadioGroup is also used by an admin form,
 * and this card layout is specific to the customer booking flow.
 */
export function PaymentMethodSelector({ value, onChange, error }: PaymentMethodSelectorProps) {
  const name = useId()
  const errorId = `${name}-error`

  return (
    <fieldset className="flex flex-col gap-4" aria-describedby={error ? errorId : undefined}>
      <legend className="sr-only">Payment method</legend>
      <div aria-hidden="true" className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-secondary-100 text-primary-700">
          <CreditCard className="h-4 w-4" strokeWidth={1.5} />
        </span>
        <h2 className="font-serif text-xl font-semibold text-text">Payment Method</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const optionId = `${name}-${option.value}`
          const checked = value === option.value
          const Icon = option.icon

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex cursor-pointer flex-col gap-3 rounded-card border-2 bg-surface p-5 text-sm transition-colors',
                checked ? 'border-primary' : 'border-border hover:border-primary-300',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 font-serif text-base font-semibold text-text">
                  <Icon aria-hidden="true" className="h-[18px] w-[18px] text-text" strokeWidth={1.5} />
                  {option.label}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    checked ? 'border-primary' : 'border-border',
                  )}
                >
                  {checked && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                <input
                  id={optionId}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={checked}
                  onChange={() => onChange(option.value)}
                  className="sr-only"
                />
              </span>
              <span className="text-text-muted">{option.description}</span>
              {option.badges && (
                <span className="flex flex-wrap gap-1.5">
                  {option.badges.map((badge) => (
                    <Badge key={badge.label} variant={badge.variant}>
                      {badge.label.toUpperCase()}
                    </Badge>
                  ))}
                </span>
              )}
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
