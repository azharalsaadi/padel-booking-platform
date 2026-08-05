import { useTranslation } from 'react-i18next'
import type { SelectedSlot } from '@/types/api'
import { formatDateLabel, formatTimeLabel } from '@/lib/datetime'
import { EmptyState } from '@/components/ui/EmptyState'

interface SelectedSlotsListProps {
  slots: SelectedSlot[]
  onRemove: (slot: SelectedSlot) => void
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

/**
 * One self-contained row per selected slot (date and time together) rather
 * than grouping under per-date headings — every row already carries its
 * own date, so a separate heading would just repeat it.
 */
export function SelectedSlotsList({ slots, onRemove }: SelectedSlotsListProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar' : 'en'

  if (slots.length === 0) {
    return <EmptyState title={t('booking.noTimesSelectedTitle')} description={t('booking.noTimesSelectedDescription')} />
  }

  const sorted = [...slots].sort((a, b) => (a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)))

  return (
    <ul className="flex flex-col divide-y divide-border">
      {sorted.map((slot) => (
        <li key={`${slot.date}-${slot.start_time}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-secondary-100 text-primary-700">
              <CalendarIcon />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary-700 uppercase">{formatDateLabel(slot.date, locale)}</p>
              <p className="text-sm font-semibold text-text">
                {formatTimeLabel(slot.start_time, locale)} &ndash; {formatTimeLabel(slot.end_time, locale)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(slot)}
            aria-label={t('booking.removeAt', { date: formatDateLabel(slot.date, locale), time: formatTimeLabel(slot.start_time, locale) })}
            className="rounded-control p-2 text-text-muted hover:bg-danger-50 hover:text-danger"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
