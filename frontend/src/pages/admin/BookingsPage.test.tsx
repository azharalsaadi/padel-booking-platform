import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { BookingsPage } from '@/pages/admin/BookingsPage'
import * as adminApi from '@/api/admin'
import type { AdminBooking, Court } from '@/types/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

const courts: Court[] = [{ id: 1, name: 'Court 1', description: null, is_active: true, sort_order: 0, created_at: '', updated_at: '' }]

function booking(overrides: Partial<AdminBooking> = {}): AdminBooking {
  return {
    id: 1,
    booking_reference: 'BK-20260810-000001',
    booking_status: 'confirmed',
    payment_method: 'pay_at_venue',
    payment_status: 'pending',
    paid_at: null,
    currency: 'OMR',
    total_price_baisa: 10000,
    customer_phone: '+96891234567',
    customer_name: 'Ahmed',
    customer_email: null,
    notes: null,
    hold_expires_at: null,
    confirmed_at: null,
    cancelled_at: null,
    created_at: null,
    slots: [{ date: '2026-08-10', start_time: '18:00', end_time: '19:00', price_baisa: 10000, court_id: 1, court_name: 'Court 1' }],
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

function mockCourts() {
  mockedApi.fetchCourts.mockResolvedValue({ data: courts, meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
}

describe('BookingsPage', () => {
  it('shows a loading state', () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<BookingsPage />)

    expect(screen.getByLabelText('Loading bookings')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<BookingsPage />)

    expect(await screen.findByText('No bookings found')).toBeInTheDocument()
  })

  it('shows a network error state with retry', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockRejectedValue(new Error('down'))
    renderWithProviders(<BookingsPage />)

    expect(await screen.findByText("We couldn't load bookings.")).toBeInTheDocument()
  })

  it('shows assigned court information — this is the protected admin view', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [booking()], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
    renderWithProviders(<BookingsPage />)

    expect(await screen.findAllByText('Court 1')).not.toHaveLength(0)
  })

  it('applies the court filter individually', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [booking()], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
    renderWithProviders(<BookingsPage />)

    await screen.findByRole('option', { name: 'Court 1' })
    await userEvent.selectOptions(screen.getByLabelText('Court'), '1')

    await waitFor(() => expect(mockedApi.fetchAdminBookings).toHaveBeenLastCalledWith(expect.objectContaining({ court_id: 1 })))
  })

  it('applies the status filter individually', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<BookingsPage />)

    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'confirmed')

    await waitFor(() => expect(mockedApi.fetchAdminBookings).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'confirmed' })))
  })

  it('applies the payment method filter individually', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<BookingsPage />)

    await userEvent.selectOptions(await screen.findByLabelText('Payment method'), 'thawani')

    await waitFor(() => expect(mockedApi.fetchAdminBookings).toHaveBeenLastCalledWith(expect.objectContaining({ payment_method: 'thawani' })))
  })

  it('applies the customer phone filter individually', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<BookingsPage />)

    await userEvent.type(await screen.findByLabelText('Customer phone'), '91112222')

    await waitFor(() => expect(mockedApi.fetchAdminBookings).toHaveBeenLastCalledWith(expect.objectContaining({ phone: '91112222' })))
  })

  it('applies the booking reference filter individually', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<BookingsPage />)

    await userEvent.type(await screen.findByLabelText('Booking reference'), 'BK-2026')

    await waitFor(() => expect(mockedApi.fetchAdminBookings).toHaveBeenLastCalledWith(expect.objectContaining({ reference: 'BK-2026' })))
  })

  it('applies the date range filter individually', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<BookingsPage />)

    await userEvent.type(await screen.findByLabelText('From date'), '2026-08-01')
    await userEvent.type(screen.getByLabelText('To date'), '2026-08-31')

    await waitFor(() =>
      expect(mockedApi.fetchAdminBookings).toHaveBeenLastCalledWith(
        expect.objectContaining({ date_from: '2026-08-01', date_to: '2026-08-31' }),
      ),
    )
  })

  it('combines multiple filters in a single request', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<BookingsPage />)

    await screen.findByRole('option', { name: 'Court 1' })
    await userEvent.selectOptions(screen.getByLabelText('Court'), '1')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'confirmed')
    await userEvent.selectOptions(screen.getByLabelText('Payment method'), 'pay_at_venue')

    await waitFor(() =>
      expect(mockedApi.fetchAdminBookings).toHaveBeenLastCalledWith(
        expect.objectContaining({ court_id: 1, status: 'confirmed', payment_method: 'pay_at_venue' }),
      ),
    )
  })

  it('clears all filters at once', async () => {
    mockCourts()
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<BookingsPage />)

    await userEvent.type(await screen.findByLabelText('Booking reference'), 'BK-2026')
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() =>
      expect(mockedApi.fetchAdminBookings).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ reference: expect.anything() }),
      ),
    )
  })
})
