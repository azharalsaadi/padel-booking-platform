import type { SelectedSlot } from '@/types/api'
import { formatDateLabel, formatTimeLabel } from '@/lib/datetime'
import { formatBaisa } from '@/lib/money'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

interface SelectedSlotsReviewProps {
  slots: SelectedSlot[]
  onRemove: (slot: SelectedSlot) => void
  /** The uniform per-hour rate from the current quote — every slot is exactly
   *  one hour and one tier rate applies across the whole booking, so this is
   *  also each individual slot's real price. Undefined while the quote is
   *  still loading or has failed. */
  pricePerHourBaisa: number | undefined
  currency: string
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.25" />
      <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Richer per-slot review card used only on the Step 2 review screen — Step
 * 1's compact SelectedSlotsList stays untouched for picking/removing times
 * while browsing availability. Every field shown here is real: dates/times
 * come from the cart, and price comes from the live quote's uniform
 * per-hour rate (never invented per slot, since the backend only ever
 * returns one rate for the whole booking).
 */
export function SelectedSlotsReview({ slots, onRemove, pricePerHourBaisa, currency }: SelectedSlotsReviewProps) {
  if (slots.length === 0) {
    return <EmptyState title="No times selected yet" description="Go back and choose a date and time to review it here." />
  }

  const sorted = [...slots].sort((a, b) => (a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)))

  return (
    <div className="flex flex-col divide-y divide-border">
      {sorted.map((slot) => (
        <div key={`${slot.date}-${slot.start_time}`} className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-background text-text-muted">
                <CalendarIcon />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Date</p>
                <p className="text-sm font-medium text-text">{formatDateLabel(slot.date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-background text-text-muted">
                <ClockIcon />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Time &amp; duration</p>
                <p className="text-sm font-medium text-text">
                  {formatTimeLabel(slot.start_time)}&ndash;{formatTimeLabel(slot.end_time)} (1 hour)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {pricePerHourBaisa === undefined ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <span className="font-serif text-xl font-semibold text-text">{formatBaisa(pricePerHourBaisa, currency)}</span>
            )}
            <button
              type="button"
              onClick={() => onRemove(slot)}
              className="text-xs font-semibold tracking-wide text-danger uppercase hover:underline"
            >
              Remove slot
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
