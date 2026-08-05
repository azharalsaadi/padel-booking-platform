import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerInfoForm } from '@/components/booking/CustomerInfoForm'
import type { CustomerFormValues } from '@/components/booking/CustomerInfoForm'

const emptyValues = { phone: '', name: '', email: '', notes: '' }

/** Mirrors how BookingPage actually drives this form — a real state loop, so multi-key typing reflects each keystroke like it does in production. */
function ControlledForm({ onPhoneChange }: { onPhoneChange?: (phone: string) => void }) {
  const [values, setValues] = useState<CustomerFormValues>(emptyValues)
  return (
    <CustomerInfoForm
      values={values}
      errors={{}}
      onChange={(patch) => {
        setValues((current) => ({ ...current, ...patch }))
        if (patch.phone !== undefined) onPhoneChange?.(patch.phone)
      }}
    />
  )
}

describe('CustomerInfoForm', () => {
  it('marks the phone number as required and name/email/notes as optional', () => {
    render(<CustomerInfoForm values={emptyValues} errors={{}} onChange={vi.fn()} />)

    expect(screen.getByLabelText(/phone number/i)).toBeRequired()
    expect(screen.getByLabelText(/name \(optional\)/i)).not.toBeRequired()
    expect(screen.getByLabelText(/email \(optional\)/i)).not.toBeRequired()
    expect(screen.getByLabelText(/notes \(optional\)/i)).not.toBeRequired()
  })

  it('reports field changes via onChange, converting the local digits to the full +968 format', async () => {
    let latestPhone = ''
    render(<ControlledForm onPhoneChange={(phone) => (latestPhone = phone)} />)

    await userEvent.type(screen.getByLabelText(/phone number/i), '91234567')

    expect(latestPhone).toBe('+96891234567')
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('9123 4567')
  })

  it('ignores non-digit characters and caps input at 8 local digits', async () => {
    let latestPhone = ''
    render(<ControlledForm onPhoneChange={(phone) => (latestPhone = phone)} />)

    await userEvent.type(screen.getByLabelText(/phone number/i), '9a1b2c3d4e5f6g7h8i9j')

    expect(latestPhone).toBe('+96891234567')
  })

  it('formats the displayed local number as groups of 4 for readability', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<CustomerInfoForm values={emptyValues} errors={{}} onChange={onChange} />)

    rerender(<CustomerInfoForm values={{ ...emptyValues, phone: '+96891234567' }} errors={{}} onChange={onChange} />)

    expect(screen.getByLabelText(/phone number/i)).toHaveValue('9123 4567')
  })

  it('shows a clear validation message for an invalid phone number', () => {
    render(
      <CustomerInfoForm
        values={emptyValues}
        errors={{ phone: 'Enter a valid Omani phone number, e.g. +96891234567.' }}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid Omani phone number')
  })
})
