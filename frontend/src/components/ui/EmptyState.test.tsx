import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/ui/EmptyState'

describe('EmptyState', () => {
  it('renders the title, description, and action', () => {
    render(
      <EmptyState
        title="No bookings yet"
        description="Bookings will appear here."
        action={<button type="button">Refresh</button>}
      />,
    )

    expect(screen.getByText('No bookings yet')).toBeInTheDocument()
    expect(screen.getByText('Bookings will appear here.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('renders without optional description or action', () => {
    render(<EmptyState title="No bookings yet" />)

    expect(screen.getByText('No bookings yet')).toBeInTheDocument()
  })
})
