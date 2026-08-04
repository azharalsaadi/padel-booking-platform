import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingSummary } from '@/components/booking/BookingSummary'
import type { QuoteResponse } from '@/types/api'

const quote: QuoteResponse = {
  currency: 'OMR',
  total_hours: 2,
  days: [{ date: '2026-08-10', hours: 2 }],
  standard_subtotal_baisa: 20000,
  applied_rule: { hours_from: 2, hours_to: 2, price_per_hour_baisa: 8000 },
  discount_baisa: 4000,
  total_price_baisa: 16000,
  all_slots_available: true,
  unavailable_slots: [],
}

describe('BookingSummary', () => {
  it('shows a loading state', () => {
    render(<BookingSummary quote={undefined} isLoading isError={false} onRetry={vi.fn()} />)

    expect(screen.getByLabelText('Loading price')).toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    const onRetry = vi.fn()
    render(<BookingSummary quote={undefined} isLoading={false} isError onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('prompts for a selection when there is no quote yet', () => {
    render(<BookingSummary quote={undefined} isLoading={false} isError={false} onRetry={vi.fn()} />)

    expect(screen.getByText(/select at least one time slot/i)).toBeInTheDocument()
  })

  it('renders every quote field the backend returned, all coming straight from the response', () => {
    render(<BookingSummary quote={quote} isLoading={false} isError={false} onRetry={vi.fn()} />)

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('OMR 8.000')).toBeInTheDocument()
    expect(screen.getByText('OMR 20.000')).toBeInTheDocument()
    expect(screen.getByText(/OMR 4\.000/)).toBeInTheDocument()
    expect(screen.getByText('OMR 16.000')).toBeInTheDocument()
  })

  it('flags when a selected slot is no longer available', () => {
    render(<BookingSummary quote={{ ...quote, all_slots_available: false }} isLoading={false} isError={false} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/no longer available/i)
  })

  it('renders a condensed single line in compact mode', () => {
    render(<BookingSummary quote={quote} isLoading={false} isError={false} onRetry={vi.fn()} compact />)

    expect(screen.getByText('2 hours')).toBeInTheDocument()
    expect(screen.getByText('OMR 16.000')).toBeInTheDocument()
    expect(screen.queryByText('Standard subtotal')).not.toBeInTheDocument()
  })
})
