import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import type { ToastVariant } from '@/components/ui/toastContext'

function ToastTrigger({ variant = 'success' }: { variant?: ToastVariant }) {
  const { show } = useToast()
  return (
    <button type="button" onClick={() => show({ variant, title: 'Booking cancelled' })}>
      Trigger
    </button>
  )
}

describe('ToastProvider / useToast', () => {
  it('shows a toast when show() is called', async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))

    expect(screen.getByRole('status')).toHaveTextContent('Booking cancelled')
  })

  it('dismisses a toast when its close button is clicked', async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('auto-dismisses after the default duration', async () => {
    vi.useFakeTimers()
    try {
      render(
        <ToastProvider>
          <ToastTrigger />
        </ToastProvider>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))
      expect(screen.getByRole('status')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not auto-dismiss an error toast — WCAG 2.2.1, the user must read and act on it', async () => {
    vi.useFakeTimers()
    try {
      render(
        <ToastProvider>
          <ToastTrigger variant="error" />
        </ToastProvider>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))
      expect(screen.getByRole('status')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(60_000)
      })

      expect(screen.getByRole('status')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not auto-dismiss a warning toast either', async () => {
    vi.useFakeTimers()
    try {
      render(
        <ToastProvider>
          <ToastTrigger variant="warning" />
        </ToastProvider>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))

      act(() => {
        vi.advanceTimersByTime(60_000)
      })

      expect(screen.getByRole('status')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('an error toast can still be dismissed manually', async () => {
    render(
      <ToastProvider>
        <ToastTrigger variant="error" />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('throws a helpful error when used outside a ToastProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<ToastTrigger />)).toThrow('useToast must be used within a ToastProvider')

    consoleError.mockRestore()
  })
})
