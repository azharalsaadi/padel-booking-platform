import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkingHoursEditor } from '@/components/admin/WorkingHoursEditor'

describe('WorkingHoursEditor', () => {
  it('shows all seven days', () => {
    render(<WorkingHoursEditor workingHours={[]} onSave={vi.fn()} isSaving={false} />)

    for (const day of ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
      expect(screen.getByLabelText(day)).toBeInTheDocument()
    }
  })

  it('initializes a day as enabled with its saved hours', () => {
    render(
      <WorkingHoursEditor
        workingHours={[{ day_of_week: 1, open_time: '08:00', close_time: '22:00' }]}
        onSave={vi.fn()}
        isSaving={false}
      />,
    )

    expect(screen.getByLabelText('Monday')).toBeChecked()
    expect(screen.getByLabelText('Sunday')).not.toBeChecked()
    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('22:00')).toBeInTheDocument()
  })

  it('shows "Closed" for a day with no checkbox checked, and hides its time inputs', () => {
    render(<WorkingHoursEditor workingHours={[]} onSave={vi.fn()} isSaving={false} />)

    expect(screen.getAllByText('Closed')).toHaveLength(7)
  })

  it('reveals open/close time inputs when a day is enabled', async () => {
    render(<WorkingHoursEditor workingHours={[]} onSave={vi.fn()} isSaving={false} />)

    await userEvent.click(screen.getByLabelText('Monday'))

    expect(screen.getAllByText('Closed')).toHaveLength(6)
  })

  it('starts in a saved state, and flips to unsaved once edited', async () => {
    render(<WorkingHoursEditor workingHours={[]} onSave={vi.fn()} isSaving={false} />)

    expect(screen.getByText('Saved')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Monday'))

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save working hours' })).not.toBeDisabled()
  })

  it('rejects a close time that is not after the open time, without calling onSave', async () => {
    const onSave = vi.fn()
    render(<WorkingHoursEditor workingHours={[]} onSave={onSave} isSaving={false} />)

    await userEvent.click(screen.getByLabelText('Monday'))
    fireEvent.change(screen.getByLabelText('Close'), { target: { value: '08:00' } })

    await userEvent.click(screen.getByRole('button', { name: 'Save working hours' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/close time must be after/i)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves only the enabled days, omitting closed ones entirely', async () => {
    const onSave = vi.fn()
    render(<WorkingHoursEditor workingHours={[]} onSave={onSave} isSaving={false} />)

    await userEvent.click(screen.getByLabelText('Monday'))
    await userEvent.click(screen.getByRole('button', { name: 'Save working hours' }))

    expect(onSave).toHaveBeenCalledWith([{ day_of_week: 1, open_time: '09:00', close_time: '21:00' }])
  })
})
