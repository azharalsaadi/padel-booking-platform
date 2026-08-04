import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@/components/ui/Checkbox'

describe('Checkbox', () => {
  it('toggles when the label text is clicked, not just the box itself', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="I agree to the cancellation policy" onChange={onChange} />)

    await userEvent.click(screen.getByText('I agree to the cancellation policy'))

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('is keyboard accessible via the Space key', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Subscribe" onChange={onChange} />)

    const checkbox = screen.getByLabelText('Subscribe')
    checkbox.focus()
    await userEvent.keyboard(' ')

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('renders an error message tied to the input via aria-describedby', () => {
    render(<Checkbox label="Subscribe" error="You must agree to continue" />)

    const checkbox = screen.getByLabelText('Subscribe')
    const alert = screen.getByRole('alert')
    expect(checkbox.getAttribute('aria-describedby')).toBe(alert.id)
  })
})
