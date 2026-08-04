import { describe, expect, it } from 'vitest'
import { isRateLimited, parseApiError } from '@/api/errors'

function axiosError(status: number, data: unknown) {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true,
    response: { status, data },
  })
}

describe('parseApiError', () => {
  it('maps a network error (no response) with status null', () => {
    const error = Object.assign(new Error('Network Error'), { isAxiosError: true, response: undefined })

    const parsed = parseApiError(error)

    expect(parsed.status).toBeNull()
    expect(parsed.message).toMatch(/could not reach the server/i)
  })

  it('maps a 422 validation error, preserving field-level messages', () => {
    const parsed = parseApiError(
      axiosError(422, { message: 'The given data was invalid.', errors: { customer_phone: ['Invalid format.'] } }),
    )

    expect(parsed.status).toBe(422)
    expect(parsed.fieldErrors).toEqual({ customer_phone: ['Invalid format.'] })
  })

  it('maps a 409 conflict, preserving error_code and unavailable_slots meta', () => {
    const parsed = parseApiError(
      axiosError(409, {
        message: 'One or more selected slots are no longer available.',
        error_code: 'SLOT_UNAVAILABLE',
        meta: { unavailable_slots: [{ date: '2026-08-10', start_time: '18:00' }] },
      }),
    )

    expect(parsed.errorCode).toBe('SLOT_UNAVAILABLE')
    expect(parsed.unavailableSlots).toEqual([{ date: '2026-08-10', start_time: '18:00' }])
  })

  it('replaces the raw 419 CSRF-mismatch message with a customer-meaningful one', () => {
    const parsed = parseApiError(axiosError(419, { message: 'CSRF token mismatch.' }))

    expect(parsed.status).toBe(419)
    expect(parsed.message).not.toMatch(/csrf/i)
    expect(parsed.message).toMatch(/session expired/i)
  })

  it('preserves the backend message verbatim for a 502 Thawani-unavailable response', () => {
    const parsed = parseApiError(
      axiosError(502, { message: 'The payment provider is temporarily unavailable. Please try again shortly.', error_code: 'THAWANI_UNAVAILABLE' }),
    )

    expect(parsed.message).toBe('The payment provider is temporarily unavailable. Please try again shortly.')
    expect(parsed.errorCode).toBe('THAWANI_UNAVAILABLE')
  })

  it('falls back to a generic message when the response body has none', () => {
    const parsed = parseApiError(axiosError(500, {}))

    expect(parsed.message).toMatch(/something went wrong/i)
  })

  it('returns a safe default for a non-axios error', () => {
    const parsed = parseApiError(new Error('unexpected'))

    expect(parsed.status).toBeNull()
    expect(parsed.message).toMatch(/something went wrong/i)
  })
})

describe('isRateLimited', () => {
  it('is true only for a 429 status', () => {
    expect(isRateLimited(parseApiError(axiosError(429, { message: 'Too Many Attempts.' })))).toBe(true)
    expect(isRateLimited(parseApiError(axiosError(422, {})))).toBe(false)
  })
})
