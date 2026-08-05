import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { BookingPage } from '@/pages/customer/BookingPage'
import { useBookingCartStore } from '@/store/bookingCart'
import * as customerApi from '@/api/customer'
import type { AvailabilitySlot, BookingView, QuoteResponse } from '@/types/api'

vi.mock('@/api/customer')

const mockedApi = vi.mocked(customerApi)

function makeSlots(date: string): AvailabilitySlot[] {
  return [
    { date, start_time: '18:00', end_time: '19:00', available: true },
    { date, start_time: '19:00', end_time: '20:00', available: true },
  ]
}

function makeQuote(hours: number): QuoteResponse {
  return {
    currency: 'OMR',
    total_hours: hours,
    days: [],
    standard_subtotal_baisa: hours * 10000,
    applied_rule: { hours_from: 1, hours_to: null, price_per_hour_baisa: 10000 },
    discount_baisa: 0,
    total_price_baisa: hours * 10000,
    all_slots_available: true,
    unavailable_slots: [],
  }
}

async function pickFirstAvailableDate() {
  const dateGroup = await screen.findByRole('group', { name: 'Select a date' })
  await userEvent.click(within(dateGroup).getByRole('button', { name: /today/i }))
}

beforeEach(() => {
  useBookingCartStore.setState({ slots: [] })
  mockedApi.fetchAvailability.mockImplementation(async (date: string) => makeSlots(date))
  mockedApi.fetchQuote.mockImplementation(async (slots) => makeQuote(slots.length))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('BookingPage — step 1: dates and slots', () => {
  it('selects a single slot for the chosen date', async () => {
    renderWithProviders(<BookingPage />)

    await pickFirstAvailableDate()
    await userEvent.click(await screen.findByRole('button', { name: '6:00 PM' }))

    expect(useBookingCartStore.getState().slots).toHaveLength(1)
    expect(screen.getByRole('button', { name: '6:00 PM' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects multiple hours on the same date', async () => {
    renderWithProviders(<BookingPage />)

    await pickFirstAvailableDate()
    await userEvent.click(await screen.findByRole('button', { name: '6:00 PM' }))
    await userEvent.click(screen.getByRole('button', { name: '7:00 PM' }))

    expect(useBookingCartStore.getState().slots).toHaveLength(2)
  })

  it('selects slots across more than one date', async () => {
    renderWithProviders(<BookingPage />)

    await pickFirstAvailableDate()
    await userEvent.click(await screen.findByRole('button', { name: '6:00 PM' }))

    const dateGroup = screen.getByRole('group', { name: 'Select a date' })
    const dateButtons = within(dateGroup).getAllByRole('button')
    await userEvent.click(dateButtons[1])
    await userEvent.click(await screen.findByRole('button', { name: '6:00 PM' }))

    const slots = useBookingCartStore.getState().slots
    expect(slots).toHaveLength(2)
    expect(new Set(slots.map((s) => s.date)).size).toBe(2)
  })

  it('removes an individual selected slot', async () => {
    renderWithProviders(<BookingPage />)

    await pickFirstAvailableDate()
    await userEvent.click(await screen.findByRole('button', { name: '6:00 PM' }))
    expect(useBookingCartStore.getState().slots).toHaveLength(1)

    const removeButton = await screen.findByRole('button', { name: /remove/i })
    await userEvent.click(removeButton)

    expect(useBookingCartStore.getState().slots).toHaveLength(0)
  })

  it('prevents duplicate selection — clicking an already-selected slot removes it instead of duplicating', async () => {
    renderWithProviders(<BookingPage />)

    await pickFirstAvailableDate()
    const slotButton = await screen.findByRole('button', { name: '6:00 PM' })
    await userEvent.click(slotButton)
    await userEvent.click(slotButton)

    expect(useBookingCartStore.getState().slots).toHaveLength(0)
  })
})

describe('BookingPage — responsive layout', () => {
  it('keeps the price summary sticky so it stays reachable while scrolling on mobile, and never renders a wide table for selections', async () => {
    const { container } = renderWithProviders(<BookingPage />)

    expect(screen.getByText('Price summary').closest('div')?.className).toContain('sticky')
    // Stacked cards, not a table — a wide table would force horizontal
    // scrolling on narrow viewports.
    expect(container.querySelector('table')).toBeNull()
  })
})

describe('BookingPage — step 2: quote review', () => {
  async function advanceToStep2() {
    renderWithProviders(<BookingPage />)
    await pickFirstAvailableDate()
    await userEvent.click(await screen.findByRole('button', { name: '6:00 PM' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
  }

  it('displays pricing from the backend quote, not a frontend calculation', async () => {
    await advanceToStep2()

    await waitFor(() => expect(mockedApi.fetchQuote).toHaveBeenCalled())
    const totalRow = (await screen.findByText('Total')).parentElement
    expect(totalRow).not.toBeNull()
    expect(within(totalRow as HTMLElement).getByText('OMR 10.000')).toBeInTheDocument()
  })

  it('shows a quote loading state before the response arrives', async () => {
    let resolveQuote: (value: QuoteResponse) => void = () => {}
    mockedApi.fetchQuote.mockImplementation(() => new Promise((resolve) => (resolveQuote = resolve)))

    await advanceToStep2()

    expect(screen.getByLabelText('Loading price')).toBeInTheDocument()
    resolveQuote(makeQuote(1))
  })

  it('shows a quote error state with a retry action', async () => {
    mockedApi.fetchQuote.mockRejectedValue(new Error('network down'))

    await advanceToStep2()

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load pricing/i)
  })

  it('disables Continue to payment while the quote is still loading — never reach payment without seeing a real price', async () => {
    let resolveQuote: (value: QuoteResponse) => void = () => {}
    mockedApi.fetchQuote.mockImplementation(() => new Promise((resolve) => (resolveQuote = resolve)))

    await advanceToStep2()

    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled()
    resolveQuote(makeQuote(1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue to payment' })).not.toBeDisabled())
  })

  it('disables Continue to payment when the quote failed to load', async () => {
    mockedApi.fetchQuote.mockRejectedValue(new Error('network down'))

    await advanceToStep2()

    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled()
  })

  it('enables Continue to payment once a valid quote with every slot available has loaded', async () => {
    await advanceToStep2()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue to payment' })).not.toBeDisabled())
  })
})

describe('BookingPage — step 3: details and payment', () => {
  async function advanceToStep3() {
    renderWithProviders(<BookingPage />)
    await pickFirstAvailableDate()
    await userEvent.click(await screen.findByRole('button', { name: '6:00 PM' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockedApi.fetchQuote).toHaveBeenCalled())
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
  }

  it('requires a valid Omani phone number before submitting', async () => {
    await advanceToStep3()

    await userEvent.click(screen.getByLabelText('Pay at Venue', { exact: false }))
    await userEvent.click(screen.getByRole('button', { name: 'Complete booking' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid omani phone number/i)
    expect(mockedApi.createBooking).not.toHaveBeenCalled()
  })

  it('allows name and email to be left blank', async () => {
    const booking: BookingView = {
      booking_reference: 'BK-20260810-000001',
      access_token: 'x'.repeat(64),
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
    mockedApi.createBooking.mockResolvedValue(booking)

    await advanceToStep3()
    await userEvent.type(screen.getByLabelText(/phone number/i), '91234567')
    await userEvent.click(screen.getByLabelText('Pay at Venue', { exact: false }))
    await userEvent.click(screen.getByRole('button', { name: 'Complete booking' }))

    await waitFor(() => expect(mockedApi.createBooking).toHaveBeenCalled())
    const payload = mockedApi.createBooking.mock.calls[0][0]
    expect(payload.customer_name).toBeNull()
    expect(payload.customer_email).toBeNull()
  })

  it('submits with pay-at-venue and navigates to the success page', async () => {
    const booking: BookingView = {
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
    mockedApi.createBooking.mockResolvedValue(booking)

    await advanceToStep3()
    await userEvent.type(screen.getByLabelText(/phone number/i), '91234567')
    await userEvent.click(screen.getByLabelText('Pay at Venue', { exact: false }))
    await userEvent.click(screen.getByRole('button', { name: 'Complete booking' }))

    await waitFor(() => expect(mockedApi.createBooking).toHaveBeenCalled())
    expect(mockedApi.createBooking.mock.calls[0][0]).toEqual(
      expect.objectContaining({ payment_method: 'pay_at_venue' }),
    )
  })

  it('submits with Thawani as the chosen payment method', async () => {
    const booking: BookingView = {
      booking_reference: 'BK-20260810-000003',
      access_token: 'z'.repeat(64),
      booking_status: 'pending_payment',
      payment_method: 'thawani',
      payment_status: 'pending',
      currency: 'OMR',
      total_hours: 1,
      total_price_baisa: 10000,
      checkout_url: 'https://uatcheckout.thawani.om/pay/checkout_abc',
      hold_expires_at: new Date(Date.now() + 600_000).toISOString(),
      customer_phone: '+96891234567',
      customer_name: null,
      customer_email: null,
      notes: null,
      slots: [{ date: '2026-08-10', start_time: '18:00', end_time: '19:00', price_baisa: 10000 }],
    }
    mockedApi.createBooking.mockResolvedValue(booking)

    await advanceToStep3()
    await userEvent.type(screen.getByLabelText(/phone number/i), '91234567')
    await userEvent.click(screen.getByLabelText('Pay Online with Thawani', { exact: false }))
    await userEvent.click(screen.getByRole('button', { name: 'Complete booking' }))

    await waitFor(() => expect(mockedApi.createBooking).toHaveBeenCalled())
    expect(mockedApi.createBooking.mock.calls[0][0]).toEqual(expect.objectContaining({ payment_method: 'thawani' }))
  })

  it('shows a clear error and keeps the booking reference-free draft when the server reports a conflict', async () => {
    mockedApi.createBooking.mockRejectedValue(
      Object.assign(new Error('conflict'), {
        isAxiosError: true,
        response: {
          status: 409,
          data: { message: 'One or more selected slots were just booked by someone else.', error_code: 'SLOT_UNAVAILABLE' },
        },
      }),
    )

    await advanceToStep3()
    await userEvent.type(screen.getByLabelText(/phone number/i), '91234567')
    await userEvent.click(screen.getByLabelText('Pay at Venue', { exact: false }))
    await userEvent.click(screen.getByRole('button', { name: 'Complete booking' }))

    expect(await screen.findByText(/just booked by someone else/i)).toBeInTheDocument()
  })

  it('shows a network-error message when the request never reaches the server', async () => {
    mockedApi.createBooking.mockRejectedValue(Object.assign(new Error('offline'), { isAxiosError: true }))

    await advanceToStep3()
    await userEvent.type(screen.getByLabelText(/phone number/i), '91234567')
    await userEvent.click(screen.getByLabelText('Pay at Venue', { exact: false }))
    await userEvent.click(screen.getByRole('button', { name: 'Complete booking' }))

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument()
  })
})
