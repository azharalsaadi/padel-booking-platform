import { useQuery } from '@tanstack/react-query'
import { fetchQuote } from '@/api/customer'
import type { SelectedSlot } from '@/types/api'

/**
 * The quote is display-only and re-fetched from the backend whenever the
 * slot selection changes — the frontend never derives a price itself, so
 * there's no client-side pricing logic to keep in sync with PricingService.
 */
export function useQuote(slots: SelectedSlot[]) {
  const slotsKey = slots.map((slot) => `${slot.date}|${slot.start_time}`).sort()

  return useQuery({
    queryKey: ['quote', slotsKey],
    queryFn: () => fetchQuote(slots),
    enabled: slots.length > 0,
  })
}
