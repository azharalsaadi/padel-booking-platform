import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CourtFormPage } from '@/pages/admin/CourtFormPage'
import * as adminApi from '@/api/admin'
import type { Court } from '@/types/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

const existingCourt: Court = {
  id: 7,
  name: 'Court 7',
  description: 'Outdoor',
  is_active: true,
  sort_order: 1,
  working_hours: [{ day_of_week: 1, open_time: '09:00', close_time: '21:00' }],
  created_at: '',
  updated_at: '',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('CourtFormPage — create mode', () => {
  function renderCreate() {
    return renderWithProviders(<CourtFormPage />, { route: '/admin/courts/new', path: '/admin/courts/new' })
  }

  it('requires a name before submitting', async () => {
    renderCreate()

    await userEvent.click(screen.getByRole('button', { name: 'Create court' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Court name is required.')
    expect(mockedApi.createCourt).not.toHaveBeenCalled()
  })

  it('creates a court with the entered details', async () => {
    mockedApi.createCourt.mockResolvedValue({ ...existingCourt, id: 9, name: 'New Court' })
    renderCreate()

    await userEvent.type(screen.getByLabelText('Name', { exact: false }), 'New Court')
    await userEvent.click(screen.getByRole('button', { name: 'Create court' }))

    await waitFor(() =>
      expect(mockedApi.createCourt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Court', is_active: true }),
      ),
    )
  })

  it('does not show a working-hours editor before the court exists', () => {
    renderCreate()

    expect(screen.queryByText('Working hours')).not.toBeInTheDocument()
  })

  it('surfaces a description field error inline instead of dropping it in a generic banner', async () => {
    mockedApi.createCourt.mockRejectedValue(
      Object.assign(new Error('invalid'), {
        isAxiosError: true,
        response: {
          status: 422,
          data: { message: 'The given data was invalid.', errors: { description: ['The description field must not be greater than 1000 characters.'] } },
        },
      }),
    )
    renderCreate()

    await userEvent.type(screen.getByLabelText('Name', { exact: false }), 'New Court')
    await userEvent.click(screen.getByRole('button', { name: 'Create court' }))

    expect(await screen.findByText(/must not be greater than 1000/i)).toBeInTheDocument()
    // Not also duplicated as a generic banner.
    expect(screen.queryByText('The given data was invalid.')).not.toBeInTheDocument()
  })
})

describe('CourtFormPage — edit mode', () => {
  function renderEdit() {
    return renderWithProviders(<CourtFormPage />, { route: '/admin/courts/7', path: '/admin/courts/:id' })
  }

  it('shows a loading state while the court loads', () => {
    mockedApi.fetchCourt.mockImplementation(() => new Promise(() => {}))
    renderEdit()

    expect(screen.getByLabelText('Loading court')).toBeInTheDocument()
  })

  it('shows an error state when the court fails to load', async () => {
    mockedApi.fetchCourt.mockRejectedValue(new Error('down'))
    renderEdit()

    expect(await screen.findByText("We couldn't load this court.")).toBeInTheDocument()
  })

  it('pre-fills the form and shows the working-hours editor', async () => {
    mockedApi.fetchCourt.mockResolvedValue(existingCourt)
    renderEdit()

    expect(await screen.findByDisplayValue('Court 7')).toBeInTheDocument()
    expect(screen.getByText('Working hours')).toBeInTheDocument()
    expect(screen.getByLabelText('Monday')).toBeChecked()
  })

  it('saves working hours independently through the working-hours API', async () => {
    mockedApi.fetchCourt.mockResolvedValue(existingCourt)
    mockedApi.updateCourtWorkingHours.mockResolvedValue(existingCourt)
    renderEdit()

    await screen.findByDisplayValue('Court 7')
    await userEvent.click(screen.getByLabelText('Tuesday'))
    await userEvent.click(screen.getByRole('button', { name: 'Save working hours' }))

    await waitFor(() =>
      expect(mockedApi.updateCourtWorkingHours).toHaveBeenCalledWith(
        7,
        expect.arrayContaining([{ day_of_week: 1, open_time: '09:00', close_time: '21:00' }]),
      ),
    )
    expect(mockedApi.updateCourt).not.toHaveBeenCalled()
  })
})
