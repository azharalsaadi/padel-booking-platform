import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminGuard } from '@/routes/AdminGuard'
import * as adminApi from '@/api/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

afterEach(() => {
  vi.clearAllMocks()
})

function renderGuarded() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/bookings']}>
        <Routes>
          <Route
            path="/admin/bookings"
            element={
              <AdminGuard>
                <p>Protected bookings content</p>
              </AdminGuard>
            }
          />
          <Route path="/admin/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminGuard', () => {
  it('shows a loading state while the session check is in flight', () => {
    mockedApi.fetchAdminMe.mockImplementation(() => new Promise(() => {}))
    renderGuarded()

    expect(screen.getByText('Checking your session')).toBeInTheDocument()
  })

  it('redirects to the login page when there is no active session', async () => {
    mockedApi.fetchAdminMe.mockRejectedValue(
      Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }),
    )
    renderGuarded()

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected bookings content')).not.toBeInTheDocument()
  })

  it('renders the protected content when a session is active', async () => {
    mockedApi.fetchAdminMe.mockResolvedValue({ id: 1, name: 'Admin User', email: 'admin@padel.test', created_at: '', updated_at: '' })
    renderGuarded()

    expect(await screen.findByText('Protected bookings content')).toBeInTheDocument()
  })
})
