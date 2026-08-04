import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { PricingPage } from '@/pages/admin/PricingPage'
import * as adminApi from '@/api/admin'
import type { PricingRule } from '@/types/admin'

vi.mock('@/api/admin')
const mockedApi = vi.mocked(adminApi)

const rule: PricingRule = { id: 1, hours_from: 1, hours_to: 1, price_per_hour_baisa: 10000, is_active: true }

afterEach(() => {
  vi.clearAllMocks()
})

describe('PricingPage', () => {
  it('shows a loading state', () => {
    mockedApi.fetchPricingRules.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<PricingPage />)

    expect(screen.getByLabelText('Loading pricing rules')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    mockedApi.fetchPricingRules.mockResolvedValue([])
    renderWithProviders(<PricingPage />)

    expect(await screen.findByText('No pricing rules')).toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    mockedApi.fetchPricingRules.mockRejectedValue(new Error('down'))
    renderWithProviders(<PricingPage />)

    expect(await screen.findByText("We couldn't load pricing rules.")).toBeInTheDocument()
  })

  it('lists rules with OMR display and active status', async () => {
    mockedApi.fetchPricingRules.mockResolvedValue([rule])
    renderWithProviders(<PricingPage />)

    expect(await screen.findByText('OMR 10.000 / hour')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('creates a new rule, converting the entered OMR price to integer baisa', async () => {
    mockedApi.fetchPricingRules.mockResolvedValue([])
    mockedApi.createPricingRule.mockResolvedValue({ id: 2, hours_from: 2, hours_to: null, price_per_hour_baisa: 8000, is_active: true })
    renderWithProviders(<PricingPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Add rule' }))
    const dialog = screen.getByRole('dialog', { name: 'Add pricing rule' })
    await userEvent.clear(within(dialog).getByLabelText('Hours from', { exact: false }))
    await userEvent.type(within(dialog).getByLabelText('Hours from', { exact: false }), '2')
    await userEvent.type(within(dialog).getByLabelText('Price per hour (OMR)', { exact: false }), '8')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add rule' }))

    await waitFor(() =>
      expect(mockedApi.createPricingRule).toHaveBeenCalledWith({
        hours_from: 2,
        hours_to: null,
        price_per_hour_baisa: 8000,
        is_active: true,
      }),
    )
  })

  it('rejects a price of zero', async () => {
    mockedApi.fetchPricingRules.mockResolvedValue([])
    renderWithProviders(<PricingPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Add rule' }))
    const dialog = screen.getByRole('dialog', { name: 'Add pricing rule' })
    await userEvent.type(within(dialog).getByLabelText('Price per hour (OMR)', { exact: false }), '0')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add rule' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent(/greater than zero/i)
    expect(mockedApi.createPricingRule).not.toHaveBeenCalled()
  })

  it('edits an existing rule, pre-filling its OMR price from stored baisa', async () => {
    mockedApi.fetchPricingRules.mockResolvedValue([rule])
    mockedApi.updatePricingRule.mockResolvedValue({ ...rule, price_per_hour_baisa: 12000 })
    renderWithProviders(<PricingPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit pricing rule' })
    expect(within(dialog).getByLabelText('Price per hour (OMR)', { exact: false })).toHaveValue(10)

    await userEvent.clear(within(dialog).getByLabelText('Price per hour (OMR)', { exact: false }))
    await userEvent.type(within(dialog).getByLabelText('Price per hour (OMR)', { exact: false }), '12')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(mockedApi.updatePricingRule).toHaveBeenCalledWith(1, expect.objectContaining({ price_per_hour_baisa: 12000 })))
  })

  it('asks for confirmation before deleting a rule', async () => {
    mockedApi.fetchPricingRules.mockResolvedValue([rule])
    renderWithProviders(<PricingPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(screen.getByRole('dialog', { name: 'Delete this pricing rule?' })).toBeInTheDocument()
    expect(mockedApi.deletePricingRule).not.toHaveBeenCalled()
  })

  it('deletes a rule once confirmed', async () => {
    mockedApi.fetchPricingRules.mockResolvedValue([rule])
    mockedApi.deletePricingRule.mockResolvedValue(undefined)
    renderWithProviders(<PricingPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this pricing rule?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockedApi.deletePricingRule).toHaveBeenCalledWith(1))
  })

  it('does not add a priority field', async () => {
    mockedApi.fetchPricingRules.mockResolvedValue([])
    renderWithProviders(<PricingPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Add rule' }))
    const dialog = screen.getByRole('dialog', { name: 'Add pricing rule' })
    expect(within(dialog).queryByLabelText(/priority/i)).not.toBeInTheDocument()
  })
})
