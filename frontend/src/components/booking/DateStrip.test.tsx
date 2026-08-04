import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateStrip } from '@/components/booking/DateStrip'
import { toLocalIsoDate } from '@/lib/datetime'

function todayIso(): string {
  return toLocalIsoDate(new Date())
}

describe('DateStrip', () => {
  it('never renders a past date — the strip starts at today', () => {
    render(<DateStrip selectedDate={null} onSelectDate={vi.fn()} daysAhead={5} />)

    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument()
  })

  it('calls onSelectDate when a date chip is clicked', async () => {
    const onSelectDate = vi.fn()
    render(<DateStrip selectedDate={null} onSelectDate={onSelectDate} daysAhead={5} />)

    await userEvent.click(screen.getByRole('button', { name: /today/i }))

    expect(onSelectDate).toHaveBeenCalledWith(todayIso())
  })

  it('marks the selected date as pressed', () => {
    render(<DateStrip selectedDate={todayIso()} onSelectDate={vi.fn()} daysAhead={5} />)

    expect(screen.getByRole('button', { name: /today/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it("the manual date picker's minimum is today, so past dates cannot be typed in either", () => {
    render(<DateStrip selectedDate={null} onSelectDate={vi.fn()} />)

    expect(screen.getByLabelText(/pick any date/i)).toHaveAttribute('min', todayIso())
  })
})
