import { useQueries } from '@tanstack/react-query'
import { fetchQuote } from '@/api/customer'
import { toLocalIsoDate } from '@/lib/datetime'
import type { SelectedSlot } from '@/types/api'

const OFFER_DURATIONS_HOURS = [1, 2, 3] as const

/**
 * A synthetic, always-valid slot selection for the given duration — never
 * submitted as a real booking. It exists purely to ask the real
 * PricingService (via the public, non-binding quote endpoint) what it
 * would charge for a session of that length, so the landing page's "Play
 * More, Pay Less" cards show genuine current pricing instead of hardcoded
 * numbers that could drift from whatever an admin has configured. Tomorrow
 * at 10:00 is used because it's always in the future regardless of the
 * time of day right now, satisfying the quote endpoint's own validation —
 * actual availability at that time is irrelevant, since a quote prices a
 * selection without checking or reserving anything.
 */
function buildSyntheticSlots(hours: number): SelectedSlot[] {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const date = toLocalIsoDate(tomorrow)

  return Array.from({ length: hours }, (_, index) => ({
    date,
    start_time: `${String(10 + index).padStart(2, '0')}:00`,
    end_time: `${String(11 + index).padStart(2, '0')}:00`,
  }))
}

/** One real quote per offered duration (1h / 2h / 3h) — see buildSyntheticSlots. */
export function useLandingOffers() {
  return useQueries({
    queries: OFFER_DURATIONS_HOURS.map((hours) => ({
      queryKey: ['landing-offer-quote', hours],
      queryFn: () => fetchQuote(buildSyntheticSlots(hours)),
      staleTime: 10 * 60 * 1000,
    })),
  })
}
