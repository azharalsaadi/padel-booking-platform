import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(screen.getByText(/nothing was lost/i)).toBeInTheDocument()
  })

  it('redirects to the new checkout_url after a successful retry', async () => {
    mockedApi.retryThawaniPayment.mockResolvedValue({
      ...booking,
      checkout_url: 'https://uatcheckout.thawani.om/pay/new_session',
    })
    // jsdom's window.location.assign isn't directly spy-able (non-configurable),
    // so the whole location object is swapped for a mock-friendly stand-in.
    const assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock },
      writable: true,
    })

    renderFailed()
    await userEvent.click(await screen.findByRole('button', { name: 'Retry payment' }))

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('https://uatcheckout.thawani.om/pay/new_session'))
  })

  it('shows an error toast when retry succeeds but no checkout_url comes back', async () => {
    mockedApi.retryThawaniPayment.mockResolvedValue({ ...booking, checkout_url: undefined })

    renderFailed()
    await userEvent.click(await screen.findByRole('button', { name: 'Retry payment' }))

    expect(await screen.findByText('Could not start payment')).toBeInTheDocument()
  })

  it('shows an error toast when the retry request itself fails', async () => {
    mockedApi.retryThawaniPayment.mockRejectedValue(
      Object.assign(new Error('down'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'The payment hold for this booking has expired.', error_code: 'PAYMENT_HOLD_EXPIRED' } },
      }),
    )

    renderFailed()
    await userEvent.click(await screen.findByRole('button', { name: 'Retry payment' }))

    expect(await screen.findByText('The payment hold for this booking has expired.')).toBeInTheDocument()
  })
})
