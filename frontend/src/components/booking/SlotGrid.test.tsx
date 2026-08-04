import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlotGrid } from '@/components/booking/SlotGrid'
import type { AvailabilitySlot } from '@/types/api'

const slots: AvailabilitySlot[] = [
  { date: '2026-08-10', start_time: '18:00', end_time: '19:00', available: true },
  { date: '2026-08-10', start_time: '19:00', end_time: '20:00', available: true },
]

describe('SlotGrid', () => {
  it('shows a loading state', () => {
    render(
      <SlotGrid date="2026-08-10" slots={undefined} isLoading isError={false} onRetry={vi.fn()} isSelected={() => false} onToggle={vi.fn()} />,
    )

    expect(screen.getByLabelText('Loading available times')).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const onRetry = vi.fn()
    render(
      <SlotGrid date="2026-08-10" slots={undefined} isLoading={false} isError onRetry={onRetry} isSelected={() => false} onToggle={vi.fn()} />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when there are no available slots', () => {
    render(
      <SlotGrid date="2026-08-10" slots={[]} isLoading={false} isError={false} onRetry={vi.fn()} isSelected={() => false} onToggle={vi.fn()} />,
    )

    expect(screen.getByText('No available times')).toBeInTheDocument()
  })

  it('renders every available slot as a toggle button with no court information anywhere', () => {
    render(
      <SlotGrid date="2026-08-10" slots={slots} isLoading={false} isError={false} onRetry={vi.fn()} isSelected={() => false} onToggle={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: '6:00 PM' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7:00 PM' })).toBeInTheDocument()
    expect(screen.queryByText(/court/i)).not.toBeInTheDocument()
  })

  it('calls onToggle with the clicked slot', async () => {
    const onToggle = vi.fn()
    render(
      <SlotGrid date="2026-08-10" slots={slots} isLoading={false} isError={false} onRetry={vi.fn()} isSelected={() => false} onToggle={onToggle} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '6:00 PM' }))

    expect(onToggle).toHaveBeenCalledWith(slots[0])
  })

  it('marks an already-selected slot as pressed', () => {
    render(
      <SlotGrid
        date="2026-08-10"
        slots={slots}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        isSelected={(date, startTime) => date === '2026-08-10' && startTime === '18:00'}
        onToggle={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '6:00 PM' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '7:00 PM' })).toHaveAttribute('aria-pressed', 'false')
  })
})
