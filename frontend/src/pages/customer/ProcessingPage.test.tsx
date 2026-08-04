import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ProcessingPage } from '@/pages/customer/ProcessingPage'
import * as customerApi from '@/api/customer'
import type { BookingView } from '@/types/api'

vi.mock('@/api/customer')

const mockedApi = vi.mocked(customerApi)
const TOKEN = 'guest-access-token-123'

const pendingBooking: BookingView = {
  booking_reference: 'BK-20260810-000001',
  booking_status: 'pending_payment',
  payment_method: 'thawani',
  payment_status: 'pending',
  currency: 'OMR',
  total_hours: 1,
  total_price_baisa: 10000,
  hold_expires_at: new Date(Date.now() + 600_000).toISOString(),
  customer_phone: '+96891234567',
  customer_name: null,
  customer_email: null,
  notes: null,
  slots: [{ date: '2026-08-10', start_time: '18:00', end_time: '19:00', price_baisa: 10000 }],
}

function renderProcessing() {
  return renderWithProviders(<ProcessingPage />, { route: `/booking/${TOKEN}/processing`, path: '/booking/:token/processing' })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ProcessingPage', () => {
  beforeEach(() => {
    mockedApi.fetchBookingByToken.mockResolvedValue(pendingBooking)
  })

  it('automatically re-verifies payment status on load rather than trusting the URL', async () => {
    mockedApi.refreshPaymentStatus.mockResolvedValue({ ...pendingBooking, booking_status: 'confirmed', payment_status: 'paid' })
    renderProcessing()

    await screen.findByText('BK-20260810-000001')
    expect(mockedApi.refreshPaymentStatus).toHaveBeenCalledWith(TOKEN)
  })

  it('shows the confirmed result once the refresh resolves', async () => {
    mockedApi.refreshPaymentStatus.mockResolvedValue({ ...pendingBooking, booking_status: 'confirmed', payment_status: 'paid' })
    renderProcessing()

    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
  })

  it('shows a retryable error if Thawani cannot be reached, without losing the booking reference', async () => {
    mockedApi.refreshPaymentStatus.mockRejectedValue(
      Object.assign(new Error('down'), {
        isAxiosError: true,
        response: { status: 502, data: { message: 'The payment provider is temporarily unavailable. Please try again shortly.', error_code: 'THAWANI_UNAVAILABLE' } },
      }),
    )
    renderProcessing()

    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i)
    expect(screen.getByText('BK-20260810-000001')).toBeInTheDocument()
  })

  it('shows a loading state before the booking loads', () => {
    mockedApi.fetchBookingByToken.mockImplementation(() => new Promise(() => {}))
    renderProcessing()

    expect(screen.getByLabelText('Loading your booking')).toBeInTheDocument()
  })
})
