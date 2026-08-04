import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders its label and responds to clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Confirm</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('defaults to type="button" so it never accidentally submits a form', () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole('button', { name: 'Click me' })).toHaveAttribute('type', 'button')
  })

  it('is disabled and marked aria-busy while loading, and does not fire onClick', async () => {
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Saving
      </Button>,
    )

    const button = screen.getByRole('button', { name: /saving/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    await userEvent.click(button, { pointerEventsCheck: 0 })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('respects an explicit disabled prop', () => {
    render(<Button disabled>Disabled</Button>)

    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  it('the outline variant is a bordered surface button, distinct from the filled secondary variant', () => {
    render(<Button variant="outline">Cancel</Button>)

    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button.className).toContain('border')
    expect(button.className).toContain('bg-surface')
  })
})
