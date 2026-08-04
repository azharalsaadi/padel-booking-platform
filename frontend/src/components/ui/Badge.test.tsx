import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge variant="success">Confirmed</Badge>)

    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('defaults to the neutral variant', () => {
    render(<Badge>Neutral</Badge>)

    expect(screen.getByText('Neutral').className).toContain('bg-secondary-100')
  })
})
