import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerInfoForm } from '@/components/booking/CustomerInfoForm'

const emptyValues = { phone: '', name: '', email: '', notes: '' }

describe('CustomerInfoForm', () => {
  it('marks the phone number as required and name/email/notes as optional', () => {
    render(<CustomerInfoForm values={emptyValues} errors={{}} onChange={vi.fn()} />)

    expect(screen.getByLabelText(/phone number/i)).toBeRequired()
    expect(screen.getByLabelText(/name \(optional\)/i)).not.toBeRequired()
    expect(screen.getByLabelText(/email \(optional\)/i)).not.toBeRequired()
    expect(screen.getByLabelText(/notes \(optional\)/i)).not.toBeRequired()
  })

  it('reports field changes via onChange', async () => {
    const onChange = vi.fn()
    render(<CustomerInfoForm values={emptyValues} errors={{}} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText(/phone number/i), '+')

    expect(onChange).toHaveBeenCalledWith({ phone: '+' })
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
