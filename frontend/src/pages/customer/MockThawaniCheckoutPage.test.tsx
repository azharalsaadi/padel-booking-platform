import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MockThawaniCheckoutPage } from '@/pages/customer/MockThawaniCheckoutPage'
import * as customerApi from '@/api/customer'
import type { BookingView } from '@/types/api'

vi.mock('@/api/customer')
const mockedApi = vi.mocked(customerApi)

const SESSION_ID = 'mock_abc123'

const session = {
  booking_reference: 'BK-20260810-000001',
  total_price_baisa: 10000,
  currency: 'OMR',
  payment_status: 'pending',
}

const confirmedBooking: BookingView = {
  booking_reference: 'BK-20260810-000001',
  access_token: 'a'.repeat(64),
  booking_status: 'confirmed',
  payment_method: 'thawani',
  payment_status: 'paid',
  currency: 'OMR',
  total_hours: 1,
  total_price_baisa: 10000,
  customer_phone: '+96891234567',
  customer_name: null,
  customer_email: null,
  notes: null,
  slots: [{ date: '2026-08-10', start_time: '18:00', end_time: '19:00', price_baisa: 10000 }],
}

function renderPage() {
  return renderWithProviders(<MockThawaniCheckoutPage />, {
    route: `/mock-thawani/${SESSION_ID}`,
    path: '/mock-thawani/:sessionId',
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('MockThawaniCheckoutPage', () => {
  it('labels the page as powered by the Thawani sandbox, not a real payment gateway', async () => {
    mockedApi.fetchMockThawaniSession.mockResolvedValue(session)
    renderPage()

    expect(screen.getByText('Powered by Thawani Sandbox')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Complete Payment' })).toBeInTheDocument()
  })

  it('shows the booking reference and amount due', async () => {
    mockedApi.fetchMockThawaniSession.mockResolvedValue(session)
    renderPage()

    expect(await screen.findByText('BK-20260810-000001')).toBeInTheDocument()
    expect(screen.getByText('OMR 10.000')).toBeInTheDocument()
  })

  it('shows an error state for an invalid/expired session id', async () => {
    mockedApi.fetchMockThawaniSession.mockRejectedValue(new Error('not found'))
    renderPage()

    expect(await screen.findByText('Could not load this test payment')).toBeInTheDocument()
  })

  it('completes the test payment and navigates away on success', async () => {
    mockedApi.fetchMockThawaniSession.mockResolvedValue(session)
    mockedApi.completeMockThawaniPayment.mockResolvedValue(confirmedBooking)
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Complete Payment' }))

    await waitFor(() => expect(mockedApi.completeMockThawaniPayment).toHaveBeenCalledWith(SESSION_ID))
    await waitFor(() => expect(screen.queryByText('Simulated Thawani Checkout')).not.toBeInTheDocument())
  })

  it('simulates a failed/cancelled payment and navigates away', async () => {
    mockedApi.fetchMockThawaniSession.mockResolvedValue(session)
    mockedApi.failMockThawaniPayment.mockResolvedValue({ ...confirmedBooking, booking_status: 'expired', payment_status: 'failed' })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel Payment' }))

    await waitFor(() => expect(mockedApi.failMockThawaniPayment).toHaveBeenCalledWith(SESSION_ID))
    await waitFor(() => expect(screen.queryByText('Simulated Thawani Checkout')).not.toBeInTheDocument())
  })

  it('shows an error message if the test payment action itself fails', async () => {
    mockedApi.fetchMockThawaniSession.mockResolvedValue(session)
    mockedApi.completeMockThawaniPayment.mockRejectedValue(new Error('down'))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Complete Payment' }))

    expect(await screen.findByText('Could not record this test payment result. Please try again.')).toBeInTheDocument()
  })
})
