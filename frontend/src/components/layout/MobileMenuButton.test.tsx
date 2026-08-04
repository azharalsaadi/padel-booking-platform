import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileMenuButton } from '@/components/layout/MobileMenuButton'

describe('MobileMenuButton', () => {
  it('reflects the open state via aria-expanded and aria-controls', () => {
    render(<MobileMenuButton isOpen={false} onClick={vi.fn()} controls="main-nav" label="Main menu" />)

    const button = screen.getByRole('button', { name: 'Open main menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'main-nav')
  })

  it('swaps to a close label when open', () => {
    render(<MobileMenuButton isOpen onClick={vi.fn()} controls="main-nav" label="Main menu" />)

    expect(screen.getByRole('button', { name: 'Close main menu' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<MobileMenuButton isOpen={false} onClick={onClick} controls="main-nav" />)

    await userEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
