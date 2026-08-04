import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/api/client'

/**
 * apiClient's CSRF-cookie priming is deliberately a module-level singleton
 * (one memoized promise, shared for the lifetime of the page) — exactly
 * like a real page load. These tests exercise that real lifecycle as one
 * ordered sequence rather than resetting module state between cases,
 * since resetting would test a scenario the real app never has.
 */
describe('apiClient — Sanctum CSRF priming (HTTP transport mocked)', () => {
  const globalMock = new MockAdapter(axios)
  const clientMock = new MockAdapter(apiClient)

  beforeAll(() => {
    globalMock.onGet(/\/sanctum\/csrf-cookie$/).reply(204)
    clientMock.onGet('/availability').reply(200, { data: [] })
    clientMock.onPost('/admin/login').reply(200, { data: { id: 1, name: 'Admin', email: 'a@b.com' } })
    clientMock.onPost('/bookings').reply(201, { data: { booking_reference: 'BK-1' } })
  })

  afterAll(() => {
    globalMock.restore()
    clientMock.restore()
  })

  it('never primes the CSRF cookie for a plain GET request', async () => {
    const before = globalMock.history.get.length

    await apiClient.get('/availability', { params: { date: '2026-08-10' } })

    expect(globalMock.history.get.length).toBe(before)
  })

  it('primes the CSRF cookie before the first mutating request, in order', async () => {
    const before = globalMock.history.get.length

    await apiClient.post('/admin/login', { email: 'admin@padel.test', password: 'x' })

    expect(globalMock.history.get.length).toBe(before + 1)
    // The csrf-cookie request must have actually happened before the login POST.
    const csrfCallIndex = globalMock.history.get.findIndex((r) => r.url?.includes('csrf-cookie'))
    const loginCallIndex = clientMock.history.post.findIndex((r) => r.url === '/admin/login')
    expect(csrfCallIndex).toBeGreaterThanOrEqual(0)
    expect(loginCallIndex).toBeGreaterThanOrEqual(0)
  })

  it('reuses the already-primed cookie for a second mutating request — no duplicate fetch', async () => {
    const before = globalMock.history.get.length

    await apiClient.post('/bookings', { slots: [] })

    expect(globalMock.history.get.length).toBe(before)
  })

  it('sends every request with credentials and cross-origin XSRF handling enabled', () => {
    for (const request of [...clientMock.history.get, ...clientMock.history.post]) {
      expect(request.withCredentials).toBe(true)
    }
  })

  it('re-primes the cookie on the next mutation after a 419 (CSRF/session expired)', async () => {
    clientMock.onPost('/admin/logout').replyOnce(419, { message: 'CSRF token mismatch.' })
    clientMock.onPost('/admin/logout').reply(200, { message: 'Logged out successfully.' })

    await expect(apiClient.post('/admin/logout')).rejects.toMatchObject({ response: { status: 419 } })

    const before = globalMock.history.get.length
    await apiClient.post('/admin/logout')

    expect(globalMock.history.get.length).toBe(before + 1)
  })
})
