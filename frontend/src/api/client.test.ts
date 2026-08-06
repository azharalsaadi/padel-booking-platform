import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/api/client'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/api/adminToken'

describe('apiClient — Sanctum bearer token auth (HTTP transport mocked)', () => {
  const clientMock = new MockAdapter(apiClient)

  beforeEach(() => {
    clearAdminToken()
  })

  afterEach(() => {
    clientMock.reset()
    clearAdminToken()
  })

  it('sends no Authorization header when no admin token is stored', async () => {
    clientMock.onGet('/availability').reply(200, { data: [] })

    await apiClient.get('/availability', { params: { date: '2026-08-10' } })

    expect(clientMock.history.get[0]?.headers?.Authorization).toBeUndefined()
  })

  it('attaches Authorization: Bearer <token> once a token is stored', async () => {
    setAdminToken('1|plain-text-token-value')
    clientMock.onGet('/admin/me').reply(200, { data: { id: 1, name: 'Admin', email: 'a@b.com' } })

    await apiClient.get('/admin/me')

    expect(clientMock.history.get[0]?.headers?.Authorization).toBe('Bearer 1|plain-text-token-value')
  })

  it('sends the stored token on guest booking requests too (harmless — backend ignores it there)', async () => {
    setAdminToken('1|plain-text-token-value')
    clientMock.onPost('/bookings').reply(201, { data: { booking_reference: 'BK-1' } })

    await apiClient.post('/bookings', { slots: [] })

    expect(clientMock.history.post[0]?.headers?.Authorization).toBe('Bearer 1|plain-text-token-value')
  })

  it('clears the stored token on a 401 response', async () => {
    setAdminToken('1|plain-text-token-value')
    clientMock.onGet('/admin/me').reply(401, { message: 'Unauthenticated.' })

    await expect(apiClient.get('/admin/me')).rejects.toMatchObject({ response: { status: 401 } })

    expect(getAdminToken()).toBeNull()
  })

  it('leaves the stored token alone on a non-401 error', async () => {
    setAdminToken('1|plain-text-token-value')
    clientMock.onGet('/admin/bookings').reply(500, { message: 'Server error.' })

    await expect(apiClient.get('/admin/bookings')).rejects.toMatchObject({ response: { status: 500 } })

    expect(getAdminToken()).toBe('1|plain-text-token-value')
  })
})

describe('apiClient — no cookie/CSRF flow', () => {
  it('does not send credentials with requests (no cookie/CSRF session auth)', () => {
    expect(apiClient.defaults.withCredentials).not.toBe(true)
    expect(apiClient.defaults.withXSRFToken).not.toBe(true)
  })
})
