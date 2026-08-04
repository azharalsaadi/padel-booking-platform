import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { LandingPage } from '@/pages/customer/LandingPage'
import * as customerApi from '@/api/customer'
import type { QuoteResponse } from '@/types/api'

// LandingPage no longer renders its own header/footer — it uses the same
// CustomerHeader/CustomerFooter as every other customer page via
// CustomerShell (see router.tsx). Navbar/footer behavior is covered by
// CustomerHeader.test.tsx and CustomerFooter.test.tsx; this file only
// covers the page's own sections (hero/offers/journey/CTA).
vi.mock('@/api/customer')

const mockedApi = vi.mocked(customerApi)

function makeQuote(hours: number): QuoteResponse {
  const baseRate = 10000
  const rates: Record<number, number> = { 1: 10000, 2: 8000, 3: 7000 }
  const pricePerHour = rates[hours] ?? baseRate
  const standardSubtotal = hours * baseRate
  const total = hours * pricePerHour

  return {
    currency: 'OMR',
    total_hours: hours,
    days: [],
    standard_subtotal_baisa: standardSubtotal,
    applied_rule: { hours_from: hours, hours_to: hours === 3 ? null : hours, price_per_hour_baisa: pricePerHour },
    discount_baisa: standardSubtotal - total,
    total_price_baisa: total,
    all_slots_available: true,
    unavailable_slots: [],
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('LandingPage — hero', () => {
  it('renders the hero heading and a Book Now link to /book', async () => {
    mockedApi.fetchQuote.mockImplementation(async (slots) => makeQuote(slots.length))
    renderWithProviders(<LandingPage />)

    expect(screen.getByRole('heading', { name: /Book Premium Padel Courts\s*in Seconds/ })).toBeInTheDocument()
    const bookNowLinks = screen.getAllByRole('link', { name: 'Book Now' })
    expect(bookNowLinks.length).toBeGreaterThan(0)
    bookNowLinks.forEach((link) => expect(link).toHaveAttribute('href', '/book'))
  })
})

describe('LandingPage — offers', () => {
  it('shows real per-hour pricing from the backend quote endpoint for each duration, not hardcoded numbers', async () => {
    mockedApi.fetchQuote.mockImplementation(async (slots) => makeQuote(slots.length))
    renderWithProviders(<LandingPage />)

    await waitFor(() => expect(mockedApi.fetchQuote).toHaveBeenCalledTimes(3))
    expect(await screen.findByText('OMR 10')).toBeInTheDocument()
    expect(await screen.findByText('OMR 8')).toBeInTheDocument()
    expect(await screen.findByText('OMR 7')).toBeInTheDocument()
  })

  it('shows a real "Save" badge only on the featured 2-hour offer', async () => {
    mockedApi.fetchQuote.mockImplementation(async (slots) => makeQuote(slots.length))
    renderWithProviders(<LandingPage />)

    expect(await screen.findByText('Save 20%')).toBeInTheDocument()
    expect(screen.queryByText('Save 30%')).not.toBeInTheDocument()
  })

  it('every "Book This Offer" action links to /book', async () => {
    mockedApi.fetchQuote.mockImplementation(async (slots) => makeQuote(slots.length))
    renderWithProviders(<LandingPage />)

    const offerLinks = await screen.findAllByRole('link', { name: 'Book This Offer' })
    expect(offerLinks).toHaveLength(3)
    offerLinks.forEach((link) => expect(link).toHaveAttribute('href', '/book'))
  })

  it('shows a "View All Offers" link pointing at the offers section', async () => {
    mockedApi.fetchQuote.mockImplementation(async (slots) => makeQuote(slots.length))
    renderWithProviders(<LandingPage />)

    expect(screen.getByRole('link', { name: /View All Offers/ })).toHaveAttribute('href', '#offers')
  })

  it('shows a per-card error message if a rate fails to load, without breaking the page', async () => {
    mockedApi.fetchQuote.mockRejectedValue(new Error('network down'))
    renderWithProviders(<LandingPage />)

    const errors = await screen.findAllByText('Could not load this rate.')
    expect(errors).toHaveLength(3)
  })
})

describe('LandingPage — journey', () => {
  it('shows the three real supported steps, with no unsupported services', async () => {
    mockedApi.fetchQuote.mockImplementation(async (slots) => makeQuote(slots.length))
    renderWithProviders(<LandingPage />)

    expect(screen.getByText('Select Date')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(screen.getByText('Play')).toBeInTheDocument()
    expect(screen.queryByText(/coaching/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/equipment rental/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/concierge/i)).not.toBeInTheDocument()
  })
})

describe('LandingPage — CTA', () => {
  it('shows the "Ready to Play?" section with a Book Now link', async () => {
    mockedApi.fetchQuote.mockImplementation(async (slots) => makeQuote(slots.length))
    renderWithProviders(<LandingPage />)

    expect(screen.getByRole('heading', { name: 'Ready to Play?' })).toBeInTheDocument()
  })
})
