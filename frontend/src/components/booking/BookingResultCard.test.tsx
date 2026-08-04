import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingResultCard } from '@/components/booking/BookingResultCard'
import { ToastProvider } from '@/components/ui/Toast'
import type { BookingView } from '@/types/api'

const baseBooking: BookingView = {
  booking_reference: 'BK-20260810-000123',
  booking_status: 'confirmed',
  payment_method: 'pay_at_venue',
  payment_status: 'pending',
  currency: 'OMR',
  total_hours: 1,
  total_price_baisa: 10000,
  customer_phone: '+96891234567',
  customer_name: null,
  customer_email: null,
  notes: null,
  slots: [{ date: '2026-08-10', start_time: '18:00', end_time: '19:00', price_baisa: 10000 }],
}

function renderCard(booking: BookingView, actions?: ReactNode) {
  return render(
    <ToastProvider>
      <BookingResultCard booking={booking} actions={actions} />
    </ToastProvider>,
  )
}

describe('BookingResultCard', () => {
  it('shows the access token when present (the initial booking-creation result)', () => {
    renderCard({ ...baseBooking, access_token: 'a'.repeat(64) })

    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument()
    expect(screen.getByText(/save this access link/i)).toBeInTheDocument()
  })

  it('never shows an access token block when the field is absent (lookup/cancel/retry/refresh results)', () => {
    renderCard(baseBooking)

    expect(screen.queryByText(/save this access link/i)).not.toBeInTheDocument()
  })

  it('renders no court information anywhere', () => {
    renderCard(baseBooking)

    const text = document.body.textContent ?? ''
    expect(text.toLowerCase()).not.toContain('court')
  })

  it('shows the hold expiry only for a pending Thawani booking', () => {
    renderCard({
      ...baseBooking,
      payment_method: 'thawani',
      booking_status: 'pending_payment',
      hold_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    })

    expect(screen.getByRole('status')).toHaveTextContent(/complete payment before/i)
  })

  it('does not show the hold expiry once the booking is confirmed', () => {
    renderCard({ ...baseBooking, payment_method: 'thawani', booking_status: 'confirmed', hold_expires_at: null })

    expect(screen.queryByText(/complete payment before/i)).not.toBeInTheDocument()
  })

  it('copies a text summary to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    renderCard(baseBooking)
    await userEvent.click(screen.getByRole('button', { name: 'Copy booking details' }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('BK-20260810-000123'))
    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
  })

  it('renders custom actions passed in by the calling page', () => {
    renderCard(baseBooking, <button type="button">Cancel booking</button>)

    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
  })
})
