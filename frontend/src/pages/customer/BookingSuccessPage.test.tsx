import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { BookingSuccessPage } from '@/pages/customer/BookingSuccessPage'
import type { BookingView } from '@/types/api'

const payAtVenueBooking: BookingView = {
  booking_reference: 'BK-20260810-000001',
  access_token: 'a'.repeat(64),
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

function renderSuccess(booking?: BookingView) {
  return renderWithProviders(<BookingSuccessPage />, {
    route: { pathname: '/booking/success', state: booking ? { booking } : undefined },
    path: '/booking/success',
  })
}

describe('BookingSuccessPage', () => {
  it('shows an empty state when reached without a booking in router state', () => {
    renderSuccess()

    expect(screen.getByText('No booking to show')).toBeInTheDocument()
  })

  it('shows the access token on this initial result', () => {
    renderSuccess(payAtVenueBooking)

    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument()
  })

  it('renders no court information', () => {
    renderSuccess(payAtVenueBooking)

    expect(document.body.textContent?.toLowerCase()).not.toContain('court');
  })

  describe('Thawani redirect', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    it('shows a redirect notice and a manual continue link when a checkout_url is present', () => {
      const booking: BookingView = {
        ...payAtVenueBooking,
        payment_method: 'thawani',
        booking_status: 'pending_payment',
        checkout_url: 'https://uatcheckout.thawani.om/pay/checkout_abc',
        hold_expires_at: new Date(Date.now() + 600_000).toISOString(),
      }
      renderSuccess(booking)

      expect(screen.getByText(/redirecting you to thawani/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'continue to payment' })).toHaveAttribute('href', booking.checkout_url)
    })

    it('shows a clear message without losing the booking reference when Thawani init failed (no checkout_url)', () => {
      const booking: BookingView = {
        ...payAtVenueBooking,
        payment_method: 'thawani',
        booking_status: 'pending_payment',
        checkout_url: undefined,
      }
      renderSuccess(booking)

      expect(screen.getByRole('alert')).toHaveTextContent(/couldn't start the online payment/i)
      expect(screen.getByText(booking.booking_reference)).toBeInTheDocument()
    })
  })
})
