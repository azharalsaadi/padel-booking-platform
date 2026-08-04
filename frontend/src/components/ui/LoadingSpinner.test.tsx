import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('exposes a status role with default screen-reader text', () => {
    render(<LoadingSpinner />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('accepts a custom label', () => {
    render(<LoadingSpinner label="Cancelling booking" />)

    expect(screen.getByRole('status')).toHaveTextContent('Cancelling booking')
  })
})
