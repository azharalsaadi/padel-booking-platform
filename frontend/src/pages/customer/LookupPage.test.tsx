import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { LookupPage } from '@/pages/customer/LookupPage'

describe('LookupPage', () => {
  it('requires an access code before searching', async () => {
    renderWithProviders(<LookupPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Find my booking' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter your booking access/i)
  })

  it('navigates to the booking management route for the entered code', async () => {
    renderWithProviders(<LookupPage />)

    await userEvent.type(screen.getByLabelText('Booking access code', { exact: false }), 'my-access-token')
    await userEvent.click(screen.getByRole('button', { name: 'Find my booking' }))

    // No lookup-by-reference-and-phone anywhere — the only input is the access code itself.
    expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/reference/i)).not.toBeInTheDocument()
  })
})
