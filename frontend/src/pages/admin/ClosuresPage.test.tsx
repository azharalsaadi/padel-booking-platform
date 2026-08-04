import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ClosuresPage } from '@/pages/admin/ClosuresPage'
import * as adminApi from '@/api/admin'
import type { Court, CourtClosure } from '@/types/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

const courts: Court[] = [
  { id: 1, name: 'Court 1', description: null, is_active: true, sort_order: 0, created_at: '', updated_at: '' },
  { id: 2, name: 'Court 2', description: null, is_active: true, sort_order: 1, created_at: '', updated_at: '' },
]

function closure(overrides: Partial<CourtClosure>): CourtClosure {
  return {
    id: 1,
    batch_id: null,
    court_id: 1,
    court_name: 'Court 1',
    date_start: '2026-08-10',
    date_end: '2026-08-10',
    is_full_day: true,
    start_time: null,
    end_time: null,
    reason: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

function mockBaseData() {
  mockedApi.fetchCourts.mockResolvedValue({ data: courts, meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 } })
}

describe('ClosuresPage — creating each mode', () => {
  it('creates a full-day closure for all courts on a single date', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    mockedApi.createClosure.mockResolvedValue([closure({ court_id: null, court_name: null })])
    renderWithProviders(<ClosuresPage />)

    await screen.findByLabelText('All courts', { exact: false })
    await userEvent.type(screen.getByLabelText('Date'), '2026-08-10')
    await userEvent.click(screen.getByRole('button', { name: 'Create closure' }))

    await waitFor(() =>
      expect(mockedApi.createClosure).toHaveBeenCalledWith({
        court_ids: null,
        dates: { mode: 'single', values: ['2026-08-10'] },
        is_full_day: true,
        start_time: null,
        end_time: null,
        reason: null,
      }),
    )
  })

  it('explains clearly what "all courts" means', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<ClosuresPage />)

    expect(await screen.findByText(/applies to every court, including any added later/i)).toBeInTheDocument()
  })

  it('creates a closure for specific courts', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    mockedApi.createClosure.mockResolvedValue([closure({})])
    renderWithProviders(<ClosuresPage />)

    await userEvent.click(await screen.findByLabelText('Specific courts'))
    await userEvent.click(screen.getByLabelText('Court 1'))
    await userEvent.type(screen.getByLabelText('Date'), '2026-08-10')
    await userEvent.click(screen.getByRole('button', { name: 'Create closure' }))

    await waitFor(() =>
      expect(mockedApi.createClosure).toHaveBeenCalledWith(expect.objectContaining({ court_ids: [1] })),
    )
  })

  it('requires at least one court when "specific courts" is chosen', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<ClosuresPage />)

    await userEvent.click(await screen.findByLabelText('Specific courts'))
    await userEvent.type(screen.getByLabelText('Date'), '2026-08-10')
    await userEvent.click(screen.getByRole('button', { name: 'Create closure' }))

    expect(await screen.findByText(/select at least one court/i)).toBeInTheDocument()
    expect(mockedApi.createClosure).not.toHaveBeenCalled()
  })

  it('creates a closure across multiple non-consecutive dates', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    mockedApi.createClosure.mockResolvedValue([closure({})])
    renderWithProviders(<ClosuresPage />)

    await userEvent.click(await screen.findByLabelText('Multiple dates', { exact: false }))
    const dateInputs = screen.getAllByLabelText(/^Date \d$/, { exact: false })
    await userEvent.type(dateInputs[0], '2026-08-10')
    await userEvent.click(screen.getByRole('button', { name: 'Add another date' }))
    const updatedInputs = screen.getAllByLabelText(/^Date \d$/, { exact: false })
    await userEvent.type(updatedInputs[1], '2026-08-15')
    await userEvent.click(screen.getByRole('button', { name: 'Create closure' }))

    await waitFor(() =>
      expect(mockedApi.createClosure).toHaveBeenCalledWith(
        expect.objectContaining({ dates: { mode: 'multiple', values: ['2026-08-10', '2026-08-15'] } }),
      ),
    )
  })

  it('creates a closure across a date range', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    mockedApi.createClosure.mockResolvedValue([closure({})])
    renderWithProviders(<ClosuresPage />)

    await userEvent.click(await screen.findByLabelText('Date range'))
    await userEvent.type(screen.getByLabelText('Start date'), '2026-08-10')
    await userEvent.type(screen.getByLabelText('End date'), '2026-08-20')
    await userEvent.click(screen.getByRole('button', { name: 'Create closure' }))

    await waitFor(() =>
      expect(mockedApi.createClosure).toHaveBeenCalledWith(
        expect.objectContaining({ dates: { mode: 'range', range: { start: '2026-08-10', end: '2026-08-20' } } }),
      ),
    )
  })

  it('creates a partial-time closure with validated start/end times', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    mockedApi.createClosure.mockResolvedValue([closure({ is_full_day: false, start_time: '18:00', end_time: '20:00' })])
    renderWithProviders(<ClosuresPage />)

    await userEvent.type(await screen.findByLabelText('Date'), '2026-08-10')
    await userEvent.click(screen.getByLabelText('Full-day closure'))
    await waitFor(() => expect(mockedApi.createClosure).not.toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Create closure' }))

    await waitFor(() =>
      expect(mockedApi.createClosure).toHaveBeenCalledWith(
        expect.objectContaining({ is_full_day: false, start_time: '09:00', end_time: '21:00' }),
      ),
    )
  })
})

describe('ClosuresPage — list and deletion', () => {
  it('shows an empty state when there are no closures', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
    renderWithProviders(<ClosuresPage />)

    expect(await screen.findByText('No closures')).toBeInTheDocument()
  })

  it('deletes a single (non-batch) closure after confirmation', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({ data: [closure({ id: 5 })], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
    mockedApi.deleteClosure.mockResolvedValue(undefined)
    renderWithProviders(<ClosuresPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove this closure?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockedApi.deleteClosure).toHaveBeenCalledWith(5))
  })

  it('deletes an entire batch after confirmation', async () => {
    mockBaseData()
    mockedApi.fetchClosures.mockResolvedValue({
      data: [
        closure({ id: 10, batch_id: 'batch-abc', court_id: 1, court_name: 'Court 1' }),
        closure({ id: 11, batch_id: 'batch-abc', court_id: 2, court_name: 'Court 2' }),
      ],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
    })
    mockedApi.deleteClosureBatch.mockResolvedValue({ message: 'ok', deleted_count: 2 })
    renderWithProviders(<ClosuresPage />)

    expect(await screen.findByText('Batch of 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete entire batch' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this entire closure batch?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockedApi.deleteClosureBatch).toHaveBeenCalledWith('batch-abc'))
  })
})
