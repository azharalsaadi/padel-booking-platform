import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { baisaToOmr } from '@/lib/money'
import type { PricingRule, PricingRulePayload } from '@/types/admin'

interface PricingRuleFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: PricingRulePayload) => void
  isSubmitting: boolean
  error?: string | null
  /** Present when editing; absent when creating a new rule. */
  rule?: PricingRule | null
}

/** OMR is what the admin types/sees; every payload sent to the API is integer baisa. */
export function PricingRuleFormModal({ open, onClose, onSubmit, isSubmitting, error, rule }: PricingRuleFormModalProps) {
  const [hoursFrom, setHoursFrom] = useState('1')
  const [hasMaxHours, setHasMaxHours] = useState(false)
  const [hoursTo, setHoursTo] = useState('')
  const [priceOmr, setPriceOmr] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    if (rule) {
      setHoursFrom(String(rule.hours_from))
      setHasMaxHours(rule.hours_to !== null)
      setHoursTo(rule.hours_to !== null ? String(rule.hours_to) : '')
      setPriceOmr(baisaToOmr(rule.price_per_hour_baisa).toString())
      setIsActive(rule.is_active)
    } else {
      setHoursFrom('1')
      setHasMaxHours(false)
      setHoursTo('')
      setPriceOmr('')
      setIsActive(true)
    }
    setValidationError(null)
  }, [open, rule])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setValidationError(null)

    const parsedFrom = Number(hoursFrom)
    const parsedTo = hasMaxHours ? Number(hoursTo) : null
    const parsedPrice = Number(priceOmr)

    if (!Number.isInteger(parsedFrom) || parsedFrom < 1) {
      setValidationError('Hours from must be a whole number of at least 1.')
      return
    }
    if (hasMaxHours && (!Number.isInteger(parsedTo) || (parsedTo as number) < parsedFrom)) {
      setValidationError('Hours to must be a whole number greater than or equal to hours from.')
      return
    }
    if (!(parsedPrice > 0)) {
      setValidationError('Price per hour must be greater than zero.')
      return
    }

    onSubmit({
      hours_from: parsedFrom,
      hours_to: parsedTo,
      price_per_hour_baisa: Math.round(parsedPrice * 1000),
      is_active: isActive,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Edit pricing rule' : 'Add pricing rule'}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input label="Hours from" type="number" min={1} required value={hoursFrom} onChange={(event) => setHoursFrom(event.target.value)} />

        <Checkbox label="Has a maximum hour count" checked={hasMaxHours} onChange={(event) => setHasMaxHours(event.target.checked)} />
        {hasMaxHours && (
          <Input label="Hours to" type="number" min={Number(hoursFrom) || 1} value={hoursTo} onChange={(event) => setHoursTo(event.target.value)} />
        )}

        <Input
          label="Price per hour (OMR)"
          type="number"
          min={0.001}
          step={0.001}
          required
          value={priceOmr}
          onChange={(event) => setPriceOmr(event.target.value)}
          helperText="Stored as integer baisa (1 OMR = 1000 baisa)."
        />

        <Checkbox label="Active" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />

        {(validationError || error) && <ErrorMessage message={validationError ?? error ?? ''} />}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {rule ? 'Save changes' : 'Add rule'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
