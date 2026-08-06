import { afterEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/api/client'
import { getAdminToken } from '@/api/adminToken'
import {
  adminLogin,
  adminLogout,
  createClosure,
  createCourt,
  createPricingRule,
  deleteClosure,
  deletePricingRule,
  fetchAdminBookings,
  fetchAdminMe,
  fetchCourts,
  updateCourt,
  updateCourtWorkingHours,
} from '@/api/admin'
import { parseApiError } from '@/api/errors'

// Response bodies mirror a real backend run (real login/courts/pricing-rules/closures/bookings HTTP calls).
describe('admin API (HTTP transport mocked, real backend response shapes)', () => {
  const clientMock = new MockAdapter(apiClient)

  afterEach(() => {
    clientMock.reset()
  })

  it('logs in, unwraps the admin+token envelope, and stores the bearer token', async () => {
    clientMock.onPost('/admin/login').reply(200, {
      data: {
        admin: { id: 1, name: 'Admin', email: 'admin@padel.test', created_at: '2026-08-02T12:39:29.000000Z', updated_at: '2026-08-02T12:39:29.000000Z' },
        token: '1|abcdefghijklmnopqrstuvwxyz',
      },
    })

    const admin = await adminLogin('admin@padel.test', 'Password123!')

    expect(admin).toEqual({ id: 1, name: 'Admin', email: 'admin@padel.test', created_at: '2026-08-02T12:39:29.000000Z', updated_at: '2026-08-02T12:39:29.000000Z' })
    expect(getAdminToken()).toBe('1|abcdefghijklmnopqrstuvwxyz')
  })

  it('logs out, calls the API with the stored bearer token, and clears the token locally', async () => {
    clientMock.onPost('/admin/login').reply(200, {
      data: {
        admin: { id: 1, name: 'Admin', email: 'admin@padel.test', created_at: '', updated_at: '' },
        token: '1|abcdefghijklmnopqrstuvwxyz',
      },
    })
    await adminLogin('admin@padel.test', 'Password123!')

    clientMock.onPost('/admin/logout').reply(200, { message: 'Logged out successfully.' })

    await adminLogout()

    expect(clientMock.history.post.find((r) => r.url === '/admin/logout')?.headers?.Authorization).toBe(
      'Bearer 1|abcdefghijklmnopqrstuvwxyz',
    )
    expect(getAdminToken()).toBeNull()
  })

  it('still clears the token locally even when the logout API call fails', async () => {
    clientMock.onPost('/admin/login').reply(200, {
      data: {
        admin: { id: 1, name: 'Admin', email: 'admin@padel.test', created_at: '', updated_at: '' },
        token: '1|abcdefghijklmnopqrstuvwxyz',
      },
    })
    await adminLogin('admin@padel.test', 'Password123!')

    clientMock.onPost('/admin/logout').networkError()

    await expect(adminLogout()).resolves.toBeUndefined()
    expect(getAdminToken()).toBeNull()
  })

  it('maps a 401 from /admin/me to an unauthenticated error', async () => {
    clientMock.onGet('/admin/me').reply(401, { message: 'Unauthenticated.' })

    try {
      await fetchAdminMe()
      expect.unreachable()
    } catch (error) {
      expect(parseApiError(error).status).toBe(401)
    }
  })

  it('maps a 422 on login to a field-level email error, matching the real generic message', async () => {
    clientMock.onPost('/admin/login').reply(422, {
      message: 'These credentials do not match our records.',
      errors: { email: ['These credentials do not match our records.'] },
    })

    try {
      await adminLogin('admin@padel.test', 'wrong')
      expect.unreachable()
    } catch (error) {
      expect(parseApiError(error).fieldErrors?.email?.[0]).toBe('These credentials do not match our records.')
    }
  })

  it('unwraps the paginated courts envelope including meta', async () => {
    clientMock.onGet('/admin/courts').reply(200, {
      data: [
        { id: 1, name: 'Court 1', description: null, is_active: true, sort_order: 1, created_at: '2026-08-02T16:39:29+04:00', updated_at: '2026-08-02T16:39:29+04:00' },
        { id: 2, name: 'Court 2', description: null, is_active: true, sort_order: 2, created_at: '2026-08-02T16:39:29+04:00', updated_at: '2026-08-02T16:39:29+04:00' },
      ],
      links: { first: 'x', last: 'x', prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
    })

    const result = await fetchCourts()

    expect(result.data).toHaveLength(2)
    expect(result.meta.total).toBe(2)
  })

  it('creates a court and later updates it (deactivate)', async () => {
    clientMock.onPost('/admin/courts').reply(201, {
      data: { id: 4, name: 'Smoke Test Court', description: 'temp', is_active: true, sort_order: 9, created_at: 'x', updated_at: 'x' },
    })
    clientMock.onPut('/admin/courts/4').reply(200, {
      data: { id: 4, name: 'Smoke Test Court', description: 'temp', is_active: false, sort_order: 9, created_at: 'x', updated_at: 'y' },
    })

    const created = await createCourt({ name: 'Smoke Test Court', description: 'temp', is_active: true, sort_order: 9 })
    expect(created.id).toBe(4)

    const updated = await updateCourt(4, { name: 'Smoke Test Court', description: 'temp', is_active: false, sort_order: 9 })
    expect(updated.is_active).toBe(false)
  })

  it('saves working hours through the dedicated endpoint, distinct from the court update endpoint', async () => {
    clientMock.onPut('/admin/courts/4/working-hours').reply(200, {
      data: {
        id: 4,
        name: 'Smoke Test Court',
        description: 'temp',
        is_active: true,
        sort_order: 9,
        working_hours: [{ day_of_week: 1, open_time: '09:00', close_time: '21:00' }],
        created_at: 'x',
        updated_at: 'x',
      },
    })

    const court = await updateCourtWorkingHours(4, [{ day_of_week: 1, open_time: '09:00', close_time: '21:00' }])

    expect(court.working_hours).toEqual([{ day_of_week: 1, open_time: '09:00', close_time: '21:00' }])
    expect(clientMock.history.put.some((r) => r.url === '/admin/courts/4')).toBe(false)
  })

  it('creates and deletes a pricing rule', async () => {
    clientMock.onPost('/admin/pricing-rules').reply(201, { data: { id: 4, hours_from: 5, hours_to: null, price_per_hour_baisa: 6000, is_active: true } })
    clientMock.onDelete('/admin/pricing-rules/4').reply(204)

    const rule = await createPricingRule({ hours_from: 5, hours_to: null, price_per_hour_baisa: 6000, is_active: true })
    expect(rule.hours_to).toBeNull()

    await expect(deletePricingRule(4)).resolves.toBeUndefined()
  })

  it('creates an all-courts closure and returns the created collection (no priority field, no pagination meta)', async () => {
    clientMock.onPost('/admin/closures').reply(201, {
      data: [{ id: 6, batch_id: null, court_id: null, date_start: '2026-09-01', date_end: '2026-09-01', is_full_day: true, start_time: null, end_time: null, reason: 'Smoke test' }],
    })
    clientMock.onDelete('/admin/closures/6').reply(204)

    const created = await createClosure({
      court_ids: null,
      dates: { mode: 'single', values: ['2026-09-01'] },
      is_full_day: true,
      reason: 'Smoke test',
    })

    expect(created).toHaveLength(1)
    expect(created[0].court_id).toBeNull()
    expect(created[0]).not.toHaveProperty('priority')

    await expect(deleteClosure(6)).resolves.toBeUndefined()
  })

  it('filters admin bookings and unwraps AdminBookingResource including court identity', async () => {
    clientMock.onGet('/admin/bookings').reply((config) => {
      expect(config.params).toEqual({ status: 'confirmed' })
      return [
        200,
        {
          data: [
            {
              id: 1,
              booking_reference: 'BK-1',
              booking_status: 'confirmed',
              payment_method: 'pay_at_venue',
              payment_status: 'pending',
              currency: 'OMR',
              total_price_baisa: 10000,
              customer_phone: '+96891234567',
              customer_name: 'Ahmed',
              customer_email: null,
              notes: null,
              hold_expires_at: null,
              confirmed_at: '2026-08-02T00:00:00Z',
              cancelled_at: null,
              created_at: '2026-08-02T00:00:00Z',
              slots: [{ date: '2026-08-05', start_time: '18:00', end_time: '19:00', price_baisa: 10000, court_id: 1, court_name: 'Court 1' }],
            },
          ],
          links: {},
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        },
      ]
    })

    const result = await fetchAdminBookings({ status: 'confirmed' })

    expect(result.meta.total).toBe(1)
    expect(result.data[0].slots[0].court_name).toBe('Court 1')
  })

  it('maps a 409 conflict when the working-hours schedule has a duplicate day_of_week', async () => {
    clientMock.onPut('/admin/courts/4/working-hours').reply(422, {
      message: 'The working hours field is invalid.',
      errors: { working_hours: ['Each day_of_week may only appear once.'] },
    })

    try {
      await updateCourtWorkingHours(4, [
        { day_of_week: 1, open_time: '09:00', close_time: '21:00' },
        { day_of_week: 1, open_time: '10:00', close_time: '20:00' },
      ])
      expect.unreachable()
    } catch (error) {
      expect(parseApiError(error).fieldErrors?.working_hours?.[0]).toContain('once')
    }
  })
})
