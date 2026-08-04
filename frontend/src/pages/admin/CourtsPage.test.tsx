import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CourtsPage } from '@/pages/admin/CourtsPage'
import * as adminApi from '@/api/admin'
import type { Court } from '@/types/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

const court: Court = {
  id: 1,
  name: 'Court 1',
  description: 'Indoor court',
  is_active: true,
  sort_order: 0,
  created_at: '',
  updated_at: '',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('CourtsPage', () => {
  it('shows a loading state', () => {
    mockedApi.fetchCourts.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<CourtsPage />)

    expect(screen.getByLabelText('Loading courts')).toBeInTheDocument()
  })

  it('shows an empty state with an add-court action', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<CourtsPage />)

    expect(await screen.findByText('No courts yet')).toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    mockedApi.fetchCourts.mockRejectedValue(new Error('network down'))
    renderWithProviders(<CourtsPage />)

    expect(await screen.findByText("We couldn't load the courts list.")).toBeInTheDocument()
  })

  it('lists courts with active/inactive status clearly shown, not by color alone', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: [court], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
    renderWithProviders(<CourtsPage />)

    expect(await screen.findByText('Court 1')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('deactivates a court', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: [court], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
    mockedApi.updateCourt.mockResolvedValue({ ...court, is_active: false })
    renderWithProviders(<CourtsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(mockedApi.updateCourt).toHaveBeenCalledWith(1, expect.objectContaining({ is_active: false })))
  })

  it('asks for confirmation before deleting a court', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: [court], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
    renderWithProviders(<CourtsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(screen.getByRole('dialog', { name: 'Delete this court?' })).toBeInTheDocument()
    expect(mockedApi.deleteCourt).not.toHaveBeenCalled()
  })

  it('deletes a court once confirmed', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: [court], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
    mockedApi.deleteCourt.mockResolvedValue(undefined)
    renderWithProviders(<CourtsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this court?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockedApi.deleteCourt).toHaveBeenCalledWith(1))
  })

  it('links to the add-court page', async () => {
    mockedApi.fetchCourts.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<CourtsPage />)

    expect(await screen.findByRole('link', { name: 'Add court' })).toHaveAttribute('href', '/admin/courts/new')
  })
})
