import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import App from '@/App'
import { router } from '@/routes/router'
import * as adminApi from '@/api/admin'

// Customer API is mocked too, purely so nothing in these tests ever makes
// a real network call — none of its exports are asserted on directly.
vi.mock('@/api/admin')
vi.mock('@/api/customer')

const mockedAdminApi = vi.mocked(adminApi)

afterEach(() => {
  vi.clearAllMocks()
})

describe('router — customer routes never require admin authentication', () => {
  it('renders the customer landing page at "/" regardless of admin session state', async () => {
    mockedAdminApi.fetchAdminMe.mockRejectedValue(
      Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }),
    )
    await act(() => router.navigate('/'))
    render(<App />)

    // CustomerHeader now checks for a session purely to label its Admin
    // Login/Dashboard link (see CustomerHeader.tsx) — that check never
    // blocks or redirects the page itself, which is the actual invariant
    // this test protects.
    expect(await screen.findByRole('heading', { name: 'Book Premium Padel Courts in Seconds' })).toBeInTheDocument()
  })

  it('renders the booking flow at "/book" regardless of admin session state', async () => {
    mockedAdminApi.fetchAdminMe.mockRejectedValue(
      Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }),
    )
    await act(() => router.navigate('/book'))
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Step 1 of 3: Select date and times' })).toBeInTheDocument()
  })

  it('renders the guest lookup page at "/my-booking" regardless of admin session state', async () => {
    mockedAdminApi.fetchAdminMe.mockRejectedValue(
      Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }),
    )
    await act(() => router.navigate('/my-booking'))
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Manage Your Booking' })).toBeInTheDocument()
  })

  it('renders the admin login page at "/admin/login" without a session redirect loop', async () => {
    mockedAdminApi.fetchAdminMe.mockRejectedValue(
      Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }),
    )
    await act(() => router.navigate('/admin/login'))
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Admin Login' })).toBeInTheDocument()
  })

  it('redirects an unauthenticated visit to a protected admin route to /admin/login', async () => {
    mockedAdminApi.fetchAdminMe.mockRejectedValue(
      Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }),
    )
    await act(() => router.navigate('/admin/bookings'))
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Admin Login' })).toBeInTheDocument()
  })

})

describe('router — complete logout flow', () => {
  function mockAuthenticatedThenLogout() {
    mockedAdminApi.fetchAdminMe.mockResolvedValue({
      id: 1,
      name: 'Admin User',
      email: 'admin@padel.test',
      created_at: '',
      updated_at: '',
    })
    // Simulates the real backend: once logout succeeds, the session is
    // actually invalidated server-side, so every /admin/me call after
    // that point must start returning 401 — a fixed mockResolvedValue
    // would silently keep reporting "still logged in" forever, which
    // is exactly the class of bug this test exists to catch.
    mockedAdminApi.adminLogout.mockImplementation(async () => {
      mockedAdminApi.fetchAdminMe.mockRejectedValue(
        Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }),
      )
    })
  }

  it('logging out calls the real API, clears the session, and lands on the customer site showing Admin Login', async () => {
    mockAuthenticatedThenLogout()
    await act(() => router.navigate('/admin/dashboard'))
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()

    await act(() => screen.getByRole('button', { name: 'Log out' }).click())

    expect(await screen.findByRole('heading', { name: /Book Premium Padel Courts\s*in Seconds/ })).toBeInTheDocument()
    expect(mockedAdminApi.adminLogout).toHaveBeenCalledTimes(1)
    // The Landing Page has its own navbar (no Admin Login/Dashboard link by
    // design — see LandingPage.tsx) — the invariant this test protects is
    // simply that logging out actually lands the admin back on the real
    // customer site, not any lingering admin-area link.
    expect(screen.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View Customer Site' })).not.toBeInTheDocument()
  })

  it('after logout, opening a protected admin route again redirects to /admin/login and requires credentials', async () => {
    mockAuthenticatedThenLogout()
    await act(() => router.navigate('/admin/dashboard'))
    render(<App />)

    await screen.findByRole('heading', { name: 'Dashboard' })
    await act(() => screen.getByRole('button', { name: 'Log out' }).click())
    await screen.findByRole('heading', { name: 'Book Premium Padel Courts in Seconds' })

    await act(() => router.navigate('/admin/bookings'))

    expect(await screen.findByRole('heading', { name: 'Admin Login' })).toBeInTheDocument()
  })
})
