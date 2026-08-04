import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'
import { BookingPage } from '@/pages/customer/BookingPage'
import { BookingSuccessPage } from '@/pages/customer/BookingSuccessPage'
import { useBookingCartStore } from '@/store/bookingCart'
import * as customerApi from '@/api/customer'
import type { AvailabilitySlot, BookingView, QuoteResponse } from '@/types/api'

/**
 * End-to-end coverage for the real submit -> post-submit navigation
 * pipeline. BookingPage.test.tsx only ever asserted on the payload sent
 * to createBooking() — it never rendered what happens after the mutation
 * resolves, which is exactly where a stale-branch bug (Thawani landing on
 * the Pay-at-Venue treatment, or lingering on an intermediate page instead
 * of going straight to checkout) would actually surface.
 *
 * Pay at Venue navigates (React Router) to /booking/success and shows
 * Booking Confirmed immediately. Thawani, when a checkout_url comes back,
 * skips that page entirely and redirects (window.location.assign) straight
 * to it — the customer only ever lands on /booking/success for Thawani in
 * the fallback case where session creation failed and there's no
 * checkout_url to send them to. renderWithProviders only mounts one route
 * at a time, so this test builds its own router with both '/' and
 * '/booking/success' registered, matching how they're actually wired in
 * routes/router.tsx.
 */

vi.mock('@/api/customer')
const mockedApi = vi.mocked(customerApi)

function makeSlots(date: string): AvailabilitySlot[] {
  return [{ date, start_time: '18:00', end_time: '19:00', available: true }]
}

function makeQuote(): QuoteResponse {
  return {
    currency: 'OMR',
    total_hours: 1,
    days: [],
    standard_subtotal_baisa: 10000,
    applied_rule: { hours_from: 1, hours_to: null, price_per_hour_baisa: 10000 },
    discount_baisa: 0,
    total_price_baisa: 10000,
    all_slots_available: true,
    unavailable_slots: [],
  }
}

function renderBookingFlow() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<BookingPage />} />
            <Route path="/booking/success" element={<BookingSuccessPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

async function submitBooking(paymentMethodLabel: string) {
  renderBookingFlow()

  const dateGroup = await screen.findByRole('group', { name: 'Select a date' })
  await userEvent.click(within(dateGroup).getByRole('button', { name: /today/i }))
  await userEvent.click(await screen.findByRole('button', { name: '6:00 PM' }))
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await waitFor(() => expect(mockedApi.fetchQuote).toHaveBeenCalled())
  await userEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))

  await userEvent.type(screen.getByLabelText(/phone number/i), '+96891234567')
  await userEvent.click(screen.getByLabelText(paymentMethodLabel, { exact: false }))
  await userEvent.click(screen.getByRole('button', { name: 'Complete booking' }))
}

const thawaniBooking: BookingView = {
  booking_reference: 'BK-20260810-000003',
  access_token: 'z'.repeat(64),
  booking_status: 'pending_payment',
  payment_method: 'thawani',
  payment_status: 'pending',
  currency: 'OMR',
  total_hours: 1,
  total_price_baisa: 10000,
  checkout_url: 'http://localhost:5173/mock-thawani/mock_abc123',
  hold_expires_at: new Date(Date.now() + 600_000).toISOString(),
  customer_phone: '+96891234567',
  customer_name: null,
  customer_email: null,
  notes: null,
  slots: [{ date: '2026-08-10', start_time: '18:00', end_time: '19:00', price_baisa: 10000 }],
}

const payAtVenueBooking: BookingView = {
  booking_reference: 'BK-20260810-000002',
  access_token: 'y'.repeat(64),
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

beforeEach(() => {
  useBookingCartStore.setState({ slots: [] })
  mockedApi.fetchAvailability.mockImplementation(async (date: string) => makeSlots(date))
  mockedApi.fetchQuote.mockImplementation(async () => makeQuote())
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('Booking submit -> success page integration', () => {
  it('Pay at Venue lands on the Booking Confirmed page with no redirect', async () => {
    mockedApi.createBooking.mockResolvedValue(payAtVenueBooking)

    await submitBooking('Pay at Venue')

    expect(await screen.findByText('Booking Confirmed')).toBeInTheDocument()
    expect(screen.queryByText(/redirecting you to thawani/i)).not.toBeInTheDocument()
  })

  it('Thawani navigates directly to /mock-thawani/{sessionId} — no intermediate Booking Confirmed/Created page', async () => {
    mockedApi.createBooking.mockResolvedValue(thawaniBooking)
    const assignMock = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, assign: assignMock }, writable: true })

    await submitBooking('Pay Online with Thawani')

    // Immediate — no 3-second wait, no intermediate render in between.
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('http://localhost:5173/mock-thawani/mock_abc123'))
    expect(screen.queryByText('Booking Confirmed')).not.toBeInTheDocument()
    expect(screen.queryByText('Booking Created')).not.toBeInTheDocument()
  })

  it('a missing checkout_url shows a clear error instead of silently treating it like Pay at Venue', async () => {
    mockedApi.createBooking.mockResolvedValue({ ...thawaniBooking, checkout_url: undefined })

    await submitBooking('Pay Online with Thawani')

    await screen.findByText('Booking Created')
    expect(screen.queryByText('Booking Confirmed')).not.toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't start the online payment/i)
  })
})
