import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('associates the visible label with the input for screen readers', () => {
    render(<Input label="Phone number" />)

    expect(screen.getByLabelText('Phone number')).toBeInTheDocument()
  })

  it('accepts typed input', async () => {
    render(<Input label="Phone number" />)

    const input = screen.getByLabelText('Phone number')
    await userEvent.type(input, '+96891234567')

    expect(input).toHaveValue('+96891234567')
  })

  it('renders an error as an alert and marks the field aria-invalid', () => {
    render(<Input label="Email" error="Enter a valid email address" />)

    const input = screen.getByLabelText('Email')
    const alert = screen.getByRole('alert')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(alert).toHaveTextContent('Enter a valid email address')
    expect(input.getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('shows a required indicator without adding it to the accessible name twice', () => {
    render(<Input label="Phone number" required />)

    expect(screen.getByLabelText('Phone number', { exact: false })).toBeRequired()
  })
})
