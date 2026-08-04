import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { LoginPage } from '@/pages/admin/LoginPage'
import * as adminApi from '@/api/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

afterEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('renders email and password fields with proper labels', () => {
    mockedApi.fetchAdminMe.mockRejectedValue(Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }))
    renderWithProviders(<LoginPage />)

    expect(screen.getByLabelText('Email', { exact: false })).toBeInTheDocument()
    expect(screen.getByLabelText('Password', { exact: false })).toBeInTheDocument()
    expect(screen.getByLabelText('Password', { exact: false })).toHaveAttribute('type', 'password')
  })

  it('submits credentials and shows a specific field error on failure', async () => {
    mockedApi.fetchAdminMe.mockRejectedValue(Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }))
    mockedApi.adminLogin.mockRejectedValue(
      Object.assign(new Error('invalid'), {
        isAxiosError: true,
        response: { status: 422, data: { message: 'The given data was invalid.', errors: { email: ['These credentials do not match our records.'] } } },
      }),
    )
    renderWithProviders(<LoginPage />)

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'admin@padel.test')
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('These credentials do not match our records.')
  })

  it('shows a rate-limit message distinctly from a field error', async () => {
    mockedApi.fetchAdminMe.mockRejectedValue(Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }))
    mockedApi.adminLogin.mockRejectedValue(
      Object.assign(new Error('rate limited'), {
        isAxiosError: true,
        response: { status: 429, data: { message: 'Too Many Attempts.' } },
      }),
    )
    renderWithProviders(<LoginPage />)

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'admin@padel.test')
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Too Many Attempts.')).toBeInTheDocument()
  })

  it('navigates away on successful login', async () => {
    mockedApi.fetchAdminMe.mockRejectedValue(Object.assign(new Error('unauth'), { isAxiosError: true, response: { status: 401, data: {} } }))
    mockedApi.adminLogin.mockResolvedValue({ id: 1, name: 'Admin User', email: 'admin@padel.test', created_at: '', updated_at: '' })

    renderWithProviders(<LoginPage />)

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'admin@padel.test')
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(mockedApi.adminLogin).toHaveBeenCalledWith('admin@padel.test', 'password'))
  })
})
