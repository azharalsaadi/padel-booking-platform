import type { AvailabilitySlot } from '@/types/api'
import { formatTimeLabel } from '@/lib/datetime'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'

interface SlotGridProps {
  date: string
  slots: AvailabilitySlot[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  isSelected: (date: string, startTime: string) => boolean
  onToggle: (slot: AvailabilitySlot) => void
}

/**
 * Every slot this renders already passed the backend's "at least one
 * court free" rule (AvailabilityController only returns available:true
 * slots) — there is no court identity anywhere in this component's props.
 */
export function SlotGrid({ date, slots, isLoading, isError, onRetry, isSelected, onToggle }: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" aria-busy="true" aria-label="Loading available times">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorMessage
        message="We couldn't load available times for this date."
        action={
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    )
  }

  if (!slots || slots.length === 0) {
    return <EmptyState title="No available times" description="There are no available time slots for this date. Try another date." />
  }

  return (
    <div
      role="group"
      aria-label={`Available times for ${date}`}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
    >
      {slots.map((slot) => {
        const selected = isSelected(slot.date, slot.start_time)

        return (
          <button
            key={`${slot.date}-${slot.start_time}`}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(slot)}
            className={cn(
              'rounded-control border px-4 py-4 text-sm font-semibold transition-colors',
              selected
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-text hover:border-primary-300',
            )}
          >
            {formatTimeLabel(slot.start_time)}
          </button>
        )
      })}
    </div>
  )
}
