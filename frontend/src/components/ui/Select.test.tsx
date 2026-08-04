import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '@/components/ui/Select'

const options = [
  { value: 'pay_at_venue', label: 'Pay at Venue' },
  { value: 'thawani', label: 'Thawani' },
]

describe('Select', () => {
  it('renders every option plus an optional disabled placeholder', () => {
    render(<Select label="Payment method" options={options} placeholder="Choose a method" />)

    expect(screen.getByRole('option', { name: 'Choose a method' })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Pay at Venue' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Thawani' })).toBeInTheDocument()
  })

  it('calls onChange with the newly selected value', async () => {
    const onChange = vi.fn()
    render(<Select label="Payment method" options={options} value="pay_at_venue" onChange={onChange} />)

    await userEvent.selectOptions(screen.getByLabelText('Payment method'), 'thawani')

    expect(onChange).toHaveBeenCalled()
  })

  it('renders the error message and marks the field aria-invalid', () => {
    render(<Select label="Payment method" options={options} error="Choose a payment method" />)

    expect(screen.getByLabelText('Payment method')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a payment method')
  })
})
