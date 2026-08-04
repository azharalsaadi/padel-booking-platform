import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Container } from '@/components/layout/Container'

describe('Container', () => {
  it('renders its children within the shared max-width wrapper', () => {
    render(<Container>Page content</Container>)

    expect(screen.getByText('Page content').className).toContain('max-w-6xl')
  })
})
