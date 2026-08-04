import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentMethodSelector } from '@/components/booking/PaymentMethodSelector'

describe('PaymentMethodSelector', () => {
  it('shows exactly the two allowed payment methods', () => {
    render(<PaymentMethodSelector value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText('Pay at Venue', { exact: false })).toBeInTheDocument()
    expect(screen.getByLabelText('Pay Online with Thawani', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
  })

  it('explains that pay-at-venue opens no online checkout', () => {
    render(<PaymentMethodSelector value="" onChange={vi.fn()} />)

    expect(screen.getByText(/no online checkout is opened/i)).toBeInTheDocument()
  })

  it('explains that Thawani is a secure online payment', () => {
    render(<PaymentMethodSelector value="" onChange={vi.fn()} />)

    expect(screen.getByText(/secure online payment/i)).toBeInTheDocument()
  })

  it('calls onChange with the selected method', async () => {
    const onChange = vi.fn()
    render(<PaymentMethodSelector value="" onChange={onChange} />)

    await userEvent.click(screen.getByLabelText('Pay Online with Thawani', { exact: false }))

    expect(onChange).toHaveBeenCalledWith('thawani')
  })
})
