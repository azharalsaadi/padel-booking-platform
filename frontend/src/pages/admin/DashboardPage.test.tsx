import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import * as adminApi from '@/api/admin'
import { toLocalIsoDate } from '@/lib/datetime'
import type { Court } from '@/types/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

const courts: Court[] = [
  { id: 1, name: 'Court 1', description: null, is_active: true, sort_order: 0, created_at: '', updated_at: '' },
  { id: 2, name: 'Court 2', description: null, is_active: false, sort_order: 1, created_at: '', updated_at: '' },
]

afterEach(() => {
  vi.clearAllMocks()
})

describe('DashboardPage', () => {
  it('shows a loading state per card', () => {
    mockedApi.fetchCourts.mockImplementation(() => new Promise(() => {}))
    mockedApi.fetchAdminBookings.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<DashboardPage />)

    expect(screen.getByText('Active courts')).toBeInTheDocument()
    expect(screen.getByText('Bookings today')).toBeInTheDocument()
    expect(screen.getByText('Pending payments')).toBeInTheDocument()
    expect(screen.getByText('Confirmed bookings')).toBeInTheDocument()
  })

  it('derives active-court count only from existing court data, no invented analytics endpoint', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: courts, meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 } })
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<DashboardPage />)

    await waitFor(() => expect(screen.getByText('Active courts').nextElementSibling).toHaveTextContent('1'))
  })

  it('queries bookings scoped to today for the "bookings today" total', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: courts, meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 } })
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 3 } })
    renderWithProviders(<DashboardPage />)

    const today = toLocalIsoDate(new Date())
    await waitFor(() =>
      expect(mockedApi.fetchAdminBookings).toHaveBeenCalledWith(expect.objectContaining({ date_from: today, date_to: today })),
    )
  })

  it('queries pending_payment and confirmed totals from the existing bookings endpoint', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: courts, meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 } })
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<DashboardPage />)

    await waitFor(() => expect(mockedApi.fetchAdminBookings).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending_payment' })))
    await waitFor(() => expect(mockedApi.fetchAdminBookings).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' })))
  })

  it('shows a per-card error state instead of failing the whole dashboard', async () => {
    mockedApi.fetchCourts.mockRejectedValue(new Error('down'))
    mockedApi.fetchAdminBookings.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Could not load')).toBeInTheDocument()
    // Other cards still render normally.
    await waitFor(() => expect(screen.getByText('Confirmed bookings').nextElementSibling).toHaveTextContent('0'))
  })
})
