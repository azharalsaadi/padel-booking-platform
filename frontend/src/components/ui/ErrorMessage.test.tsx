import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

describe('ErrorMessage', () => {
  it('renders as an alert so assistive tech announces it immediately', () => {
    render(<ErrorMessage message="We could not load this booking." />)

    expect(screen.getByRole('alert')).toHaveTextContent('We could not load this booking.')
  })

  it('supports a custom title and an optional retry action', () => {
    render(
      <ErrorMessage
        title="Network error"
        message="Please try again."
        action={<button type="button">Retry</button>}
      />,
    )

    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
