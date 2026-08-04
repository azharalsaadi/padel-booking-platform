import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/ui/Modal'

function ModalHarness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cancel this booking?">
        <button type="button">First action</button>
        <button type="button">Second action</button>
      </Modal>
    </div>
  )
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden">
        content
      </Modal>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders as an accessible dialog labelled by its title when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Cancel this booking?">
        Body content
      </Modal>,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Cancel this booking?')
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Title">
        Body
      </Modal>,
    )

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose} title="Title">
        Body
      </Modal>,
    )

    const backdrop = container.ownerDocument.body.querySelector('[aria-hidden="true"].absolute')
    expect(backdrop).not.toBeNull()
    await userEvent.click(backdrop as Element)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the dialog on open and restores it to the trigger on close', async () => {
    render(<ModalHarness />)

    const trigger = screen.getByRole('button', { name: 'Open modal' })
    trigger.focus()
    await userEvent.click(trigger)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus())

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
