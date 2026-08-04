import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/Toast'
import { ShowcasePage } from '@/pages/dev/ShowcasePage'

describe('ShowcasePage', () => {
  it('renders every design-system section without crashing', () => {
    render(
      <ToastProvider>
        <ShowcasePage />
      </ToastProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Design System Showcase' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Color Palette' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Buttons' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Form Inputs' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Toast Notifications' })).toBeInTheDocument()
  })
})
