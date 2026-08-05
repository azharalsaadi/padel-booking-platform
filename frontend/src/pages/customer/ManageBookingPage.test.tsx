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

  it('starts the booking-reference search field empty, never pre-filled with the URL access token', async () => {
    mockedApi.fetchBookingByToken.mockResolvedValue({ ...confirmedPayAtVenue, payment_status: 'paid' })
    renderManagePage()

    const searchInput = await screen.findByPlaceholderText('Enter Booking Reference')
    expect(searchInput).toHaveValue('')
    expect(document.body.textContent).not.toContain(TOKEN)
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

describe('ManageBookingPage — court row (confirmed + paid only)', () => {
  const confirmedAndPaid: BookingView = {
    ...confirmedPayAtVenue,
    payment_status: 'paid',
    slots: [{ ...confirmedPayAtVenue.slots[0], court_name: 'Court 2' }],
  }

  it('shows the real court name once the booking is confirmed and paid', async () => {
    mockedApi.fetchBookingByToken.mockResolvedValue(confirmedAndPaid)
    renderManagePage()

    await screen.findByText('BK-20260810-000001')
    expect(screen.getByText('Court')).toBeInTheDocument()
    expect(screen.getByText('Court 2')).toBeInTheDocument()
  })

  it('does not show a court row while the booking is still pending payment', async () => {
    mockedApi.fetchBookingByToken.mockResolvedValue({
      ...confirmedAndPaid,
      payment_status: 'pending',
    })
    renderManagePage()

    await screen.findByText('BK-20260810-000001')
    expect(document.body.textContent?.toLowerCase()).not.toContain('court')
  })
})

describe('ManageBookingPage — download booking PDF', () => {
  const paidBooking: BookingView = { ...confirmedPayAtVenue, payment_status: 'paid' }
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    mockedApi.fetchBookingByToken.mockResolvedValue(paidBooking)
    URL.createObjectURL = vi.fn(() => 'blob:mock-pdf-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('downloads the PDF returned by the API without navigating to a blank page', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    mockedApi.downloadBookingPdf.mockResolvedValue({ blob, filename: 'booking-BK-20260810-000001.pdf' })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    renderManagePage()
    await userEvent.click(await screen.findByRole('button', { name: 'Download Booking PDF' }))

    await waitFor(() => expect(mockedApi.downloadBookingPdf).toHaveBeenCalledWith(TOKEN))
    expect(clickSpy).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-pdf-url')

    clickSpy.mockRestore()
  })

  it('shows a loading state while the PDF is being prepared', async () => {
    mockedApi.downloadBookingPdf.mockImplementation(() => new Promise(() => {}))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    renderManagePage()
    await userEvent.click(await screen.findByRole('button', { name: 'Download Booking PDF' }))

    expect(await screen.findByRole('button', { name: 'Preparing PDF...' })).toBeDisabled()
  })

  it('shows an error toast when the download fails', async () => {
    mockedApi.downloadBookingPdf.mockRejectedValue(
      Object.assign(new Error('server error'), {
        isAxiosError: true,
        response: { status: 500, data: {} },
      }),
    )

    renderManagePage()
    await userEvent.click(await screen.findByRole('button', { name: 'Download Booking PDF' }))

    expect(await screen.findByText('Could not download PDF')).toBeInTheDocument()
  })
})

describe('ManageBookingPage — automatic payment status polling (Pay at Venue)', () => {
  beforeEach(() => {
    // shouldAdvanceTime bridges fake and real time so Testing Library's own
    // internal (setTimeout-based) polling in findBy*/waitFor keeps working
    // while vi.advanceTimersByTimeAsync drives the 5s refetchInterval ticks.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockedApi.fetchBookingByToken.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls every 5 seconds and flips Pending to Paid automatically once the admin marks it paid', async () => {
    mockedApi.fetchBookingByToken
      .mockResolvedValueOnce(confirmedPayAtVenue)
      .mockResolvedValueOnce(confirmedPayAtVenue)
      .mockResolvedValueOnce({ ...confirmedPayAtVenue, payment_status: 'paid' })

    renderManagePage()

    // Both the payment badge and the booking-status badge read "Pending"
    // before payment is confirmed (see bookingStatusLabel) — assert on the
    // count rather than a single ambiguous match.
    expect(await screen.findAllByText('Pending')).toHaveLength(2)
    expect(mockedApi.fetchBookingByToken).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)
    expect(mockedApi.fetchBookingByToken).toHaveBeenCalledTimes(2)
    expect(await screen.findAllByText('Pending')).toHaveLength(2)

    await vi.advanceTimersByTimeAsync(5000)
    expect(await screen.findByText('Paid')).toBeInTheDocument()
    expect(mockedApi.fetchBookingByToken).toHaveBeenCalledTimes(3)
    expect(screen.queryByText('Pending')).not.toBeInTheDocument()
  })

  it('stops polling once the booking is already paid', async () => {
    mockedApi.fetchBookingByToken.mockResolvedValue({ ...confirmedPayAtVenue, payment_status: 'paid' })

    renderManagePage()
    expect(await screen.findByText('Paid')).toBeInTheDocument()
    const callsSoFar = mockedApi.fetchBookingByToken.mock.calls.length

    await vi.advanceTimersByTimeAsync(15000)

    expect(mockedApi.fetchBookingByToken).toHaveBeenCalledTimes(callsSoFar)
  })

  it('stops polling once the booking is cancelled', async () => {
    mockedApi.fetchBookingByToken.mockResolvedValue({
      ...confirmedPayAtVenue,
      booking_status: 'cancelled',
      payment_status: 'pending',
    })

    renderManagePage()
    expect(await screen.findByText('BK-20260810-000001')).toBeInTheDocument()
    const callsSoFar = mockedApi.fetchBookingByToken.mock.calls.length

    await vi.advanceTimersByTimeAsync(15000)

    expect(mockedApi.fetchBookingByToken).toHaveBeenCalledTimes(callsSoFar)
  })

  it('does not poll Thawani bookings', async () => {
    mockedApi.fetchBookingByToken.mockResolvedValue({
      ...confirmedPayAtVenue,
      payment_method: 'thawani',
      payment_status: 'pending',
    })

    renderManagePage()
    expect(await screen.findByText('BK-20260810-000001')).toBeInTheDocument()
    const callsSoFar = mockedApi.fetchBookingByToken.mock.calls.length

    await vi.advanceTimersByTimeAsync(15000)

    expect(mockedApi.fetchBookingByToken).toHaveBeenCalledTimes(callsSoFar)
  })
})
