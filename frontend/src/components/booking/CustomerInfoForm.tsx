import { useId } from 'react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/cn'
import omanFlag from '@/assets/omanflag.png'

export interface CustomerFormValues {
  phone: string
  name: string
  email: string
  notes: string
}

export interface CustomerFormErrors {
  phone?: string
  name?: string
  email?: string
  notes?: string
}

interface CustomerInfoFormProps {
  values: CustomerFormValues
  errors: CustomerFormErrors
  onChange: (patch: Partial<CustomerFormValues>) => void
}

const OMAN_COUNTRY_CODE = '+968'

/** Groups the 8 local digits as "9123 4567" for on-screen readability. */
function formatLocalPhoneDigits(digits: string): string {
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits
}

export function CustomerInfoForm({ values, errors, onChange }: CustomerInfoFormProps) {
  const { t } = useTranslation()
  const phoneInputId = useId()
  const phoneErrorId = `${phoneInputId}-error`
  const phoneHelperId = `${phoneInputId}-helper`

  const localDigits = values.phone.startsWith(OMAN_COUNTRY_CODE) ? values.phone.slice(OMAN_COUNTRY_CODE.length) : ''

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8)
    onChange({ phone: digits ? `${OMAN_COUNTRY_CODE}${digits}` : '' })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={phoneInputId} className="text-sm font-medium text-text">
          {t('booking.phoneNumber')}
          <span aria-hidden="true" className="text-danger">{' '}*</span>
        </label>
        <div
          dir="ltr"
          className={cn(
            'flex items-center gap-2 rounded-control border bg-surface pl-3 pr-3.5',
            errors.phone ? 'border-danger' : 'border-border',
          )}
        >
          <img src={omanFlag} alt="" className="h-6 w-7 shrink-0 object-contain" />
          <span className="flex shrink-0 items-center gap-1 border-r border-border pr-2 text-sm font-medium text-text">
            {OMAN_COUNTRY_CODE}
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          </span>
          <input
            id={phoneInputId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={t('booking.phonePlaceholder')}
            required
            value={formatLocalPhoneDigits(localDigits)}
            onChange={handlePhoneChange}
            aria-invalid={Boolean(errors.phone) || undefined}
            aria-describedby={cn(errors.phone && phoneErrorId, !errors.phone && phoneHelperId) || undefined}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
        </div>
        {errors.phone && (
          <p id={phoneErrorId} className="text-sm text-danger" role="alert">
            {errors.phone}
          </p>
        )}
        {!errors.phone && (
          <p id={phoneHelperId} className="text-sm text-text-muted">
            {t('booking.phoneHelper')}
          </p>
        )}
      </div>
      <Input
        label={t('booking.nameOptional')}
        value={values.name}
        onChange={(event) => onChange({ name: event.target.value })}
        error={errors.name}
      />
      <div className="sm:col-span-2">
        <Input
          label={t('booking.emailOptional')}
          type="email"
          value={values.email}
          onChange={(event) => onChange({ email: event.target.value })}
          error={errors.email}
        />
      </div>
      <div className="sm:col-span-2">
        <Textarea
          label={t('booking.notesOptional')}
          value={values.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          error={errors.notes}
        />
      </div>
    </div>
  )
}
