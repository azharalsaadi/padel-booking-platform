import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AdminShell } from '@/components/layout/AdminShell'
import * as adminApi from '@/api/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)
mockedApi.fetchAdminMe.mockResolvedValue({
  id: 1,
  name: 'Admin User',
  email: 'admin@padel.test',
  created_at: '',
  updated_at: '',
})

describe('AdminShell', () => {
  it('renders the horizontal nav links and the page content', () => {
    renderWithProviders(
      <AdminShell>
        <p>Bookings table</p>
      </AdminShell>,
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bookings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Courts' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Closures' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pricing' })).toBeInTheDocument()
    expect(screen.getByText('Bookings table')).toBeInTheDocument()
  })

  it('collapses the nav off-canvas on mobile until the header toggle is pressed (responsive check)', async () => {
    renderWithProviders(
      <AdminShell>
        <p>Content</p>
      </AdminShell>,
    )

    expect(screen.getAllByRole('link', { name: 'Bookings' })).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Open admin navigation' }))

    expect(screen.getAllByRole('link', { name: 'Bookings' })).toHaveLength(2)
  })

  it('shows the signed-in admin name and a working logout button', async () => {
    renderWithProviders(
      <AdminShell>
        <p>Content</p>
      </AdminShell>,
    )

    expect(await screen.findByText('Admin User')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('does not show a "View Customer Site" link — logging out is how an admin leaves the admin area', () => {
    renderWithProviders(
      <AdminShell>
        <p>Content</p>
      </AdminShell>,
    )

    expect(screen.queryByRole('link', { name: 'View Customer Site' })).not.toBeInTheDocument()
  })

  it('clicking Log out calls the real logout API', async () => {
    mockedApi.adminLogout.mockResolvedValue(undefined)
    renderWithProviders(
      <AdminShell>
        <p>Content</p>
      </AdminShell>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(mockedApi.adminLogout).toHaveBeenCalled())
  })
})
