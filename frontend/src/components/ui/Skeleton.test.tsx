import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

describe('Skeleton', () => {
  it('is hidden from assistive tech since it carries no content', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('SkeletonText', () => {
  it('renders the requested number of placeholder lines', () => {
    const { container } = render(<SkeletonText lines={4} />)

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(4)
  })

  it('defaults to three lines', () => {
    const { container } = render(<SkeletonText />)

    // 1 wrapper + 3 line skeletons, all aria-hidden.
    expect(container.firstElementChild?.children.length).toBe(3)
  })
})
