import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CustomerFooter } from '@/components/layout/CustomerFooter'

describe('CustomerFooter', () => {
  it('shows the Rally brand statement and the current copyright year, on every customer page', () => {
    render(
      <MemoryRouter>
        <CustomerFooter />
      </MemoryRouter>,
    )

    expect(screen.getByText('RALLY')).toBeInTheDocument()
    expect(screen.getByText(/intersection of high-performance sport/i)).toBeInTheDocument()
    expect(screen.getByText(`© ${new Date().getFullYear()} Rally Premium Padel. All rights reserved.`)).toBeInTheDocument()
  })

  it('does not render Privacy Policy, Terms, Contact, or Instagram as clickable links — those destinations do not exist yet', () => {
    render(
      <MemoryRouter>
        <CustomerFooter />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Privacy Policy' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Terms of Service' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Contact Us' })).not.toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })
})
