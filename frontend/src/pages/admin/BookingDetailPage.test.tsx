import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { BookingDetailPage } from '@/pages/admin/BookingDetailPage'
import * as adminApi from '@/api/admin'
import type { AdminBooking } from '@/types/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

function booking(overrides: Partial<AdminBooking> = {}): AdminBooking {
  return {
    id: 7,
    booking_reference: 'BK-20260810-000007',
    booking_status: 'confirmed',
    payment_method: 'pay_at_venue',
    payment_status: 'pending',
    paid_at: null,
    currency: 'OMR',
    total_price_baisa: 15000,
    customer_phone: '+96891234567',
    customer_name: 'Ahmed Al Balushi',
    customer_email: 'ahmed@example.com',
    notes: 'Please prepare an extra ball.',
    hold_expires_at: null,
    confirmed_at: '2026-08-01T10:00:00+04:00',
    cancelled_at: null,
    created_at: '2026-08-01T09:55:00+04:00',
    slots: [{ date: '2026-08-10', start_time: '18:00', end_time: '19:30', price_baisa: 15000, court_id: 1, court_name: 'Court 1' }],
    ...overrides,
  }
}

function renderDetail() {
  return renderWithProviders(<BookingDetailPage />, { route: '/admin/bookings/7', path: '/admin/bookings/:id' })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('BookingDetailPage', () => {
  it('shows a loading state while the booking loads', () => {
    mockedApi.fetchAdminBooking.mockImplementation(() => new Promise(() => {}))
    renderDetail()

    expect(screen.getByLabelText('Loading booking')).toBeInTheDocument()
  })

  it('shows an error state when the booking fails to load', async () => {
    mockedApi.fetchAdminBooking.mockRejectedValue(new Error('down'))
    renderDetail()

    expect(await screen.findByText("We couldn't load this booking.")).toBeInTheDocument()
  })

  it('displays every required booking detail field', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking())
    renderDetail()

    expect(await screen.findByText('BK-20260810-000007')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Payment: Pending')).toBeInTheDocument()
    expect(screen.getByText('Pay at Venue')).toBeInTheDocument()
    expect(screen.getByText('Ahmed Al Balushi')).toBeInTheDocument()
    expect(screen.getByText('+96891234567')).toBeInTheDocument()
    expect(screen.getByText('ahmed@example.com')).toBeInTheDocument()
    expect(screen.getByText('Court 1')).toBeInTheDocument()
    expect(screen.getAllByText('OMR 15.000').length).toBeGreaterThan(0)
    expect(screen.getByText('Please prepare an extra ball.')).toBeInTheDocument()
    expect(screen.getByText(/1 Aug 2026/)).toBeInTheDocument() // Created at
  })

  it('omits the email row entirely when no email is on file', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking({ customer_email: null }))
    renderDetail()

    await screen.findByText('BK-20260810-000007')
    expect(screen.queryByText('Customer email')).not.toBeInTheDocument()
  })

  it('shows the payment time once paid', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(
      booking({ payment_status: 'paid', paid_at: '2026-08-10T18:05:00+04:00' }),
    )
    renderDetail()

    expect(await screen.findByText('Payment time')).toBeInTheDocument()
  })

  // --- Mark as Paid visibility -------------------------------------------

  it('shows "Mark as Paid" for a pending pay-at-venue booking', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking())
    renderDetail()

    expect(await screen.findByRole('button', { name: 'Mark as Paid' })).toBeInTheDocument()
  })

  it('hides "Mark as Paid" for a Thawani booking', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking({ payment_method: 'thawani' }))
    renderDetail()

    await screen.findByText('BK-20260810-000007')
    expect(screen.queryByRole('button', { name: 'Mark as Paid' })).not.toBeInTheDocument()
  })

  it('hides "Mark as Paid" once already paid', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking({ payment_status: 'paid', paid_at: '2026-08-10T18:05:00+04:00' }))
    renderDetail()

    await screen.findByText('BK-20260810-000007')
    expect(screen.queryByRole('button', { name: 'Mark as Paid' })).not.toBeInTheDocument()
  })

  it('hides "Mark as Paid" for a cancelled booking', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking({ booking_status: 'cancelled', payment_status: 'cancelled' }))
    renderDetail()

    await screen.findByText('BK-20260810-000007')
    expect(screen.queryByRole('button', { name: 'Mark as Paid' })).not.toBeInTheDocument()
  })

  it('hides "Mark as Paid" for a failed payment', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking({ payment_status: 'failed' }))
    renderDetail()

    await screen.findByText('BK-20260810-000007')
    expect(screen.queryByRole('button', { name: 'Mark as Paid' })).not.toBeInTheDocument()
  })

  // --- Mark as Paid flow ---------------------------------------------------

  it('requires confirmation before marking a booking as paid', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking())
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as Paid' }))

    expect(screen.getByRole('dialog', { name: 'Confirm payment received' })).toBeInTheDocument()
    expect(mockedApi.markBookingPaid).not.toHaveBeenCalled()
  })

  it('marks the booking as paid, refreshes it, and shows a success toast after confirming', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking())
    mockedApi.markBookingPaid.mockResolvedValue(
      booking({ payment_status: 'paid', paid_at: '2026-08-10T18:05:00+04:00' }),
    )
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as Paid' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm, mark as paid' }))

    await waitFor(() => expect(mockedApi.markBookingPaid).toHaveBeenCalledWith(7))
    expect(await screen.findByText('Payment confirmed')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText((_, element) => element?.textContent === 'Payment: Paid')).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'Mark as Paid' })).not.toBeInTheDocument()
  })

  it('cancelling the dialog does not call the API', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking())
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as Paid' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockedApi.markBookingPaid).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an error toast if marking as paid fails', async () => {
    mockedApi.fetchAdminBooking.mockResolvedValue(booking())
    mockedApi.markBookingPaid.mockRejectedValue(
      Object.assign(new Error('conflict'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'This payment has already been resolved.', error_code: 'PAYMENT_ALREADY_RESOLVED' } },
      }),
    )
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as Paid' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm, mark as paid' }))

    expect(await screen.findByText('This payment has already been resolved.')).toBeInTheDocument()
    // Still a pending pay-at-venue booking as far as this page knows — the button stays.
    expect(screen.getByRole('button', { name: 'Mark as Paid' })).toBeInTheDocument()
  })
})
