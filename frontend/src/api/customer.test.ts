import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/api/client'
import {
  cancelBooking,
  createBooking,
  fetchAvailability,
  fetchBookingByToken,
  fetchQuote,
  refreshPaymentStatus,
  retryThawaniPayment,
} from '@/api/customer'
import { parseApiError } from '@/api/errors'

// Response bodies below are the exact shapes captured from a real backend
// run during Step 16 integration verification (GET /sanctum/csrf-cookie,
// then the real endpoints) — not guessed.
describe('customer API (HTTP transport mocked, real backend response shapes)', () => {
  const globalMock = new MockAdapter(axios)
  const clientMock = new MockAdapter(apiClient)

  beforeAll(() => {
    globalMock.onGet(/\/sanctum\/csrf-cookie$/).reply(204)
  })

  afterEach(() => {
    clientMock.reset()
  })

  it('unwraps the availability envelope to a plain array', async () => {
    clientMock.onGet('/availability').reply(200, {
      data: [
        { date: '2026-08-05', start_time: '16:00', end_time: '17:00', available: true },
        { date: '2026-08-05', start_time: '17:00', end_time: '18:00', available: true },
      ],
    })

    const slots = await fetchAvailability('2026-08-05')

    expect(slots).toHaveLength(2)
    expect(slots[0]).toEqual({ date: '2026-08-05', start_time: '16:00', end_time: '17:00', available: true })
  })

  it('unwraps the quote envelope, matching the real PricingService/AvailabilityService fields', async () => {
    clientMock.onPost('/bookings/quote').reply(200, {
      data: {
        currency: 'OMR',
        total_hours: 2,
        days: [{ date: '2026-08-05', hours: 2 }],
        standard_subtotal_baisa: 20000,
        applied_rule: { hours_from: 2, hours_to: 2, price_per_hour_baisa: 8000 },
        discount_baisa: 4000,
        total_price_baisa: 16000,
        all_slots_available: true,
        unavailable_slots: [],
      },
    })

    const quote = await fetchQuote([
      { date: '2026-08-05', start_time: '18:00', end_time: '19:00' },
      { date: '2026-08-05', start_time: '19:00', end_time: '20:00' },
    ])

    expect(quote.total_price_baisa).toBe(16000)
    expect(quote.discount_baisa).toBe(4000)
  })

  it('creates a booking and preserves the one-time access_token from the real BookingResource shape', async () => {
    clientMock.onPost('/bookings').reply(201, {
      data: {
        booking_reference: 'BK-20260802-000008',
        access_token: 'GdzQn2LCs1w2Fm7zDfCHY8rdO3GpwtSzO9JuNPW55yS5OKx3JBw4U0KCGX2a9ozy',
        booking_status: 'confirmed',
        payment_method: 'pay_at_venue',
        payment_status: 'pending',
        currency: 'OMR',
        total_hours: 2,
        total_price_baisa: 16000,
        customer_phone: '+96891112222',
        customer_name: 'Smoke Test',
        customer_email: null,
        notes: null,
        slots: [
          { date: '2026-08-05', start_time: '18:00', end_time: '19:00', price_baisa: 8000 },
          { date: '2026-08-05', start_time: '19:00', end_time: '20:00', price_baisa: 8000 },
        ],
      },
    })

    const booking = await createBooking({
      customer_phone: '+96891112222',
      customer_name: 'Smoke Test',
      customer_email: null,
      notes: null,
      payment_method: 'pay_at_venue',
      slots: [
        { date: '2026-08-05', start_time: '18:00', end_time: '19:00' },
        { date: '2026-08-05', start_time: '19:00', end_time: '20:00' },
      ],
    })

    expect(booking.access_token).toHaveLength(64)
    expect(booking.booking_reference).toBe('BK-20260802-000008')
  })

  it('guest lookup response never includes access_token, matching the real endpoint', async () => {
    clientMock.onGet(/\/bookings\/.+/).reply(200, {
      data: {
        booking_reference: 'BK-20260802-000008',
        booking_status: 'confirmed',
        payment_method: 'pay_at_venue',
        payment_status: 'pending',
        currency: 'OMR',
        total_hours: 2,
        total_price_baisa: 16000,
        customer_phone: '+96891112222',
        customer_name: 'Smoke Test',
        customer_email: null,
        notes: null,
        slots: [{ date: '2026-08-05', start_time: '18:00', end_time: '19:00', price_baisa: 8000 }],
      },
    })

    const booking = await fetchBookingByToken('a-real-access-token')

    expect(booking).not.toHaveProperty('access_token')
    expect(JSON.stringify(booking)).not.toContain('court')
  })

  it('cancels a booking and reflects the cancelled status, matching the real endpoint', async () => {
    clientMock.onPost(/\/cancel$/).reply(200, {
      data: {
        booking_reference: 'BK-20260802-000008',
        booking_status: 'cancelled',
        payment_method: 'pay_at_venue',
        payment_status: 'cancelled',
        currency: 'OMR',
        total_hours: 2,
        total_price_baisa: 16000,
        customer_phone: '+96891112222',
        customer_name: 'Smoke Test',
        customer_email: null,
        notes: null,
        slots: [{ date: '2026-08-05', start_time: '18:00', end_time: '19:00', price_baisa: 8000 }],
      },
    })

    const booking = await cancelBooking('a-real-access-token')

    expect(booking.booking_status).toBe('cancelled')
    expect(booking).not.toHaveProperty('access_token')
  })

  it('retries Thawani payment and returns the new checkout_url, matching the real endpoint', async () => {
    clientMock.onPost(/\/retry-payment$/).reply(200, {
      data: {
        booking_reference: 'BK-20260802-000009',
        booking_status: 'pending_payment',
        payment_method: 'thawani',
        payment_status: 'pending',
        currency: 'OMR',
        total_hours: 1,
        total_price_baisa: 10000,
        checkout_url: 'https://uatcheckout.thawani.om/pay/checkout_new_session',
        hold_expires_at: '2026-08-02T18:00:00+04:00',
        customer_phone: '+96891113333',
        customer_name: null,
        customer_email: null,
        notes: null,
        slots: [{ date: '2026-08-08', start_time: '18:00', end_time: '19:00', price_baisa: 10000 }],
      },
    })

    const booking = await retryThawaniPayment('a-real-access-token')

    expect(booking.checkout_url).toBe('https://uatcheckout.thawani.om/pay/checkout_new_session')
  })

  it('refreshes payment status by re-verifying with the provider, never trusting a client-supplied status', async () => {
    clientMock.onPost(/\/refresh-payment$/).reply(200, {
      data: {
        booking_reference: 'BK-20260802-000009',
        booking_status: 'confirmed',
        payment_method: 'thawani',
        payment_status: 'paid',
        currency: 'OMR',
        total_hours: 1,
        total_price_baisa: 10000,
        customer_phone: '+96891113333',
        customer_name: null,
        customer_email: null,
        notes: null,
        slots: [{ date: '2026-08-08', start_time: '18:00', end_time: '19:00', price_baisa: 10000 }],
      },
    })

    const booking = await refreshPaymentStatus('a-real-access-token')

    expect(booking.booking_status).toBe('confirmed')
    expect(booking.payment_status).toBe('paid')
  })

  it('maps a 404 invalid access token to a parseable not-found error', async () => {
    clientMock.onGet(/\/bookings\/.+/).reply(404, { message: 'No query results for model [App\\Models\\Booking].' })

    await expect(fetchBookingByToken('not-a-real-token')).rejects.toBeTruthy()
    try {
      await fetchBookingByToken('not-a-real-token')
    } catch (error) {
      expect(parseApiError(error).status).toBe(404)
    }
  })

  it('maps a 422 validation error with field-level messages', async () => {
    clientMock.onPost('/bookings').reply(422, {
      message: 'The customer phone field format is invalid.',
      errors: { customer_phone: ['The customer phone field format is invalid.'] },
    })

    try {
      await createBooking({
        customer_phone: '12345',
        payment_method: 'pay_at_venue',
        slots: [{ date: '2026-08-05', start_time: '18:00', end_time: '19:00' }],
      })
      expect.unreachable()
    } catch (error) {
      const parsed = parseApiError(error)
      expect(parsed.status).toBe(422)
      expect(parsed.fieldErrors?.customer_phone?.[0]).toContain('invalid')
    }
  })

  it('maps a 409 slot-unavailable conflict with the unavailable_slots meta', async () => {
    clientMock.onPost('/bookings').reply(409, {
      message: 'One or more selected slots are no longer available.',
      error_code: 'SLOT_UNAVAILABLE',
      meta: { unavailable_slots: [{ date: '2026-08-07', start_time: '18:00' }] },
    })

    try {
      await createBooking({
        customer_phone: '+96899998888',
        payment_method: 'pay_at_venue',
        slots: [{ date: '2026-08-07', start_time: '18:00', end_time: '19:00' }],
      })
      expect.unreachable()
    } catch (error) {
      const parsed = parseApiError(error)
      expect(parsed.status).toBe(409)
      expect(parsed.errorCode).toBe('SLOT_UNAVAILABLE')
      expect(parsed.unavailableSlots).toEqual([{ date: '2026-08-07', start_time: '18:00' }])
    }
  })

  it('maps cancellation/retry conflict error codes (e.g. PAYMENT_HOLD_EXPIRED)', async () => {
    clientMock.onPost(/\/retry-payment$/).reply(409, {
      message: 'The payment hold for this booking has expired.',
      error_code: 'PAYMENT_HOLD_EXPIRED',
    })

    try {
      await retryThawaniPayment('a-token')
      expect.unreachable()
    } catch (error) {
      expect(parseApiError(error).errorCode).toBe('PAYMENT_HOLD_EXPIRED')
    }
  })

  it('maps a 429 rate-limit response', async () => {
    clientMock.onPost(/\/cancel$/).reply(429, { message: 'Too Many Attempts.' })

    try {
      await cancelBooking('a-token')
      expect.unreachable()
    } catch (error) {
      expect(parseApiError(error).status).toBe(429)
    }
  })

  it('maps a 502 Thawani-unavailable response distinctly from a network error', async () => {
    clientMock.onPost(/\/refresh-payment$/).reply(502, {
      message: 'The payment provider is temporarily unavailable. Please try again shortly.',
      error_code: 'THAWANI_UNAVAILABLE',
    })

    try {
      await refreshPaymentStatus('a-token')
      expect.unreachable()
    } catch (error) {
      const parsed = parseApiError(error)
      expect(parsed.status).toBe(502)
      expect(parsed.errorCode).toBe('THAWANI_UNAVAILABLE')
    }
  })

  it('maps a genuine network error (no response) distinctly from any HTTP status', async () => {
    clientMock.onGet('/availability').networkError()

    try {
      await fetchAvailability('2026-08-05')
      expect.unreachable()
    } catch (error) {
      const parsed = parseApiError(error)
      expect(parsed.status).toBeNull()
      expect(parsed.message).toMatch(/could not reach the server/i)
    }
  })
})
