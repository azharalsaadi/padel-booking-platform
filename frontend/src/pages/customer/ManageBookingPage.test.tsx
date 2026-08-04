import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ManageBookingPage } from '@/pages/customer/ManageBookingPage'
import * as customerApi from '@/api/customer'
import type { BookingView } from '@/types/api'

vi.mock('@/api/customer')

const mockedApi = vi.mocked(customerApi)
const TOKEN = 'guest-access-token-123'

const confirmedPayAtVenue: BookingView = {
  booking_reference: 'BK-20260810-000001',
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

function renderManagePage() {
  return renderWithProviders(<ManageBookingPage />, { route: `/booking/${TOKEN}`, path: '/booking/:token' })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ManageBookingPage — lookup', () => {
  it('shows a loading state while the booking loads', () => {
    mockedApi.fetchBookingByToken.mockImplementation(() => new Promise(() => {}))
    renderManagePage()

    expect(screen.getByLabelText('Loading your booking')).toBeInTheDocument()
  })

  it('shows a not-found message for an invalid token', async () => {
    mockedApi.fetchBookingByToken.mockRejectedValue(
      Object.assign(new Error('not found'), { isAxiosError: true, response: { status: 404, data: { message: 'Not found.' } } }),
    )
    renderManagePage()

    expect(await screen.findByText('Booking not found')).toBeInTheDocument()
  })

  it('displays the booking with no access token and no court information', async () => {
    mockedApi.fetchBookingByToken.mockResolvedValue(confirmedPayAtVenue)
    renderManagePage()

    expect(await screen.findByText('BK-20260810-000001')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(TOKEN)
    expect(document.body.textContent?.toLowerCase()).not.toContain('court')
  })
})

describe('ManageBookingPage — cancellation', () => {
  beforeEach(() => {
    mockedApi.fetchBookingByToken.mockResolvedValue(confirmedPayAtVenue)
  })

  it('asks for confirmation before cancelling', async () => {
    renderManagePage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))

    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeInTheDocument()
    expect(mockedApi.cancelBooking).not.toHaveBeenCalled()
  })

  it('cancels the booking once confirmed', async () => {
    mockedApi.cancelBooking.mockResolvedValue({ ...confirmedPayAtVenue, booking_status: 'cancelled' })
    renderManagePage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel booking' }))

    await waitFor(() => expect(mockedApi.cancelBooking).toHaveBeenCalledWith(TOKEN))
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
  })

  it('shows a clear error when cancellation is not allowed', async () => {
    mockedApi.cancelBooking.mockRejectedValue(
      Object.assign(new Error('nope'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'This booking can no longer be cancelled.', error_code: 'CANCELLATION_NOT_ALLOWED' } },
      }),
    )
    renderManagePage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel booking' }))

    expect(await screen.findByText('This booking can no longer be cancelled.')).toBeInTheDocument()
  })

  it('does not offer cancellation for an already-paid Thawani booking', async () => {
    mockedApi.fetchBookingByToken.mockResolvedValue({
      ...confirmedPayAtVenue,
      payment_method: 'thawani',
      payment_status: 'paid',
    })
    renderManagePage()

    await screen.findByText('BK-20260810-000001')
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })
})

describe('ManageBookingPage — Thawani payment retry and refresh', () => {
  const pendingThawani: BookingView = {
    ...confirmedPayAtVenue,
    booking_status: 'pending_payment',
    payment_method: 'thawani',
    hold_expires_at: new Date(Date.now() + 600_000).toISOString(),
  }

  beforeEach(() => {
    mockedApi.fetchBookingByToken.mockResolvedValue(pendingThawani)
  })

  it('retries payment and surfaces the new checkout link', async () => {
    mockedApi.retryThawaniPayment.mockResolvedValue({
      ...pendingThawani,
      checkout_url: 'https://uatcheckout.thawani.om/pay/new_session',
    })
    renderManagePage()

    await userEvent.click(await screen.findByRole('button', { name: 'Retry payment' }))

    await waitFor(() => expect(mockedApi.retryThawaniPayment).toHaveBeenCalledWith(TOKEN))
    expect(await screen.findByRole('link', { name: 'Continue to Thawani' })).toHaveAttribute(
      'href',
      'https://uatcheckout.thawani.om/pay/new_session',
    )
  })

  it('refreshes payment status on demand', async () => {
    mockedApi.refreshPaymentStatus.mockResolvedValue({ ...pendingThawani, booking_status: 'confirmed', payment_status: 'paid' })
    renderManagePage()

    await userEvent.click(await screen.findByRole('button', { name: 'Refresh payment status' }))

    await waitFor(() => expect(mockedApi.refreshPaymentStatus).toHaveBeenCalledWith(TOKEN))
    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
  })

  it('shows a safe retryable message when Thawani is unavailable', async () => {
    mockedApi.refreshPaymentStatus.mockRejectedValue(
      Object.assign(new Error('down'), {
        isAxiosError: true,
        response: { status: 502, data: { message: 'The payment provider is temporarily unavailable. Please try again shortly.', error_code: 'THAWANI_UNAVAILABLE' } },
      }),
    )
    renderManagePage()

    await userEvent.click(await screen.findByRole('button', { name: 'Refresh payment status' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i)
  })
})
