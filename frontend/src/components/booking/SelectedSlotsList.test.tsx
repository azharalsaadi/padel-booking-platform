import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectedSlotsList } from '@/components/booking/SelectedSlotsList'
import type { SelectedSlot } from '@/types/api'

describe('SelectedSlotsList', () => {
  it('shows an empty state when nothing is selected', () => {
    render(<SelectedSlotsList slots={[]} onRemove={vi.fn()} />)

    expect(screen.getByText('No times selected yet')).toBeInTheDocument()
  })

  it('renders one row per selected slot, each carrying its own real date and time', () => {
    const slots: SelectedSlot[] = [
      { date: '2026-08-10', start_time: '18:00', end_time: '19:00' },
      { date: '2026-08-12', start_time: '09:00', end_time: '10:00' },
    ]
    render(<SelectedSlotsList slots={slots} onRemove={vi.fn()} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Mon, 10 Aug 2026')).toBeInTheDocument()
    expect(screen.getByText('Wed, 12 Aug 2026')).toBeInTheDocument()
  })

  it('removes an individual slot when its remove button is clicked, leaving the other selections intact', async () => {
    const onRemove = vi.fn()
    const slots: SelectedSlot[] = [
      { date: '2026-08-10', start_time: '18:00', end_time: '19:00' },
      { date: '2026-08-10', start_time: '19:00', end_time: '20:00' },
    ]
    render(<SelectedSlotsList slots={slots} onRemove={onRemove} />)

    await userEvent.click(screen.getByRole('button', { name: /remove.*6:00 PM/i }))

    expect(onRemove).toHaveBeenCalledWith(slots[0])
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('renders no court information', () => {
    const slots: SelectedSlot[] = [{ date: '2026-08-10', start_time: '18:00', end_time: '19:00' }]
    render(<SelectedSlotsList slots={slots} onRemove={vi.fn()} />)

    expect(screen.queryByText(/court/i)).not.toBeInTheDocument()
  })
})
