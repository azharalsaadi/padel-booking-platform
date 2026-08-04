import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

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

export function CustomerInfoForm({ values, errors, onChange }: CustomerInfoFormProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Phone number"
        type="tel"
        inputMode="tel"
        placeholder="+96891234567"
        required
        value={values.phone}
        onChange={(event) => onChange({ phone: event.target.value })}
        error={errors.phone}
        helperText={errors.phone ? undefined : 'Omani mobile number, e.g. +96891234567'}
      />
      <Input
        label="Name (optional)"
        value={values.name}
        onChange={(event) => onChange({ name: event.target.value })}
        error={errors.name}
      />
      <div className="sm:col-span-2">
        <Input
          label="Email (optional)"
          type="email"
          value={values.email}
          onChange={(event) => onChange({ email: event.target.value })}
          error={errors.email}
        />
      </div>
      <div className="sm:col-span-2">
        <Textarea
          label="Notes (optional)"
          value={values.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          error={errors.notes}
        />
      </div>
    </div>
  )
}
