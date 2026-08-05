import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { PaymentFailedPage } from '@/pages/customer/PaymentFailedPage'
import * as customerApi from '@/api/customer'
import type { BookingView } from '@/types/api'

vi.mock('@/api/customer')

const mockedApi = vi.mocked(customerApi)
const TOKEN = 'guest-access-token-123'

const booking: BookingView = {
  booking_reference: 'BK-20260810-000001',
  booking_status: 'pending_payment',
  payment_method: 'thawani',
  payment_status: 'failed',
  currency: 'OMR',
  total_hours: 1,
  total_price_baisa: 10000,
  customer_phone: '+96891234567',
  customer_name: null,
  customer_email: null,
  notes: null,
  slots: [{ date: '2026-08-10', start_time: '18:00', end_time: '19:00', price_baisa: 10000 }],
}

function renderFailed() {
  return renderWithProviders(<PaymentFailedPage />, { route: `/booking/${TOKEN}/failed`, path: '/booking/:token/failed' })
}

beforeEach(() => {
  mockedApi.fetchBookingByToken.mockResolvedValue(booking)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PaymentFailedPage', () => {
  it('shows the booking reference so nothing is lost', async () => {
    renderFailed()

    expect(await screen.findByText('BK-20260810-000001')).toBeInTheDocument()
    expect(screen.getByText(/no charge has been made/i)).toBeInTheDocument()
  })

  it('does not show a Try Payment Again button', async () => {
    renderFailed()

    await screen.findByText('BK-20260810-000001')
    expect(screen.queryByRole('button', { name: /try payment again/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('keeps the View Booking link pointing at the booking token', async () => {
    renderFailed()

    const viewBookingLink = await screen.findByRole('link', { name: 'View Booking' })
    expect(viewBookingLink).toHaveAttribute('href', `/booking/${TOKEN}`)
  })

  it('keeps the Book Another Court link', async () => {
    renderFailed()

    const bookAnotherLink = await screen.findByRole('link', { name: 'Book Another Court' })
    expect(bookAnotherLink).toHaveAttribute('href', '/book')
  })
})
