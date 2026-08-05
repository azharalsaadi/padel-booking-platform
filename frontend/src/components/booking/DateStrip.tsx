import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { toLocalIsoDate } from '@/lib/datetime'

interface DateStripProps {
  selectedDate: string | null
  onSelectDate: (date: string) => void
  /** How many upcoming days (including today) to render as quick-pick chips. */
  daysAhead?: number
}

function shortLabel(date: Date, locale: 'en' | 'ar'): { weekday: string; day: string } {
  const intlLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB'
  return {
    weekday: date.toLocaleDateString(intlLocale, { weekday: 'short' }),
    day: date.toLocaleDateString(intlLocale, { day: 'numeric', month: 'short' }),
  }
}

/**
 * Past dates are never rendered at all (the loop starts at today) rather
 * than rendered-and-disabled — satisfies "disable past dates" by
 * construction. The native date input covers picking further ahead than
 * the visible strip, with the same min=today floor.
 */
export function DateStrip({ selectedDate, onSelectDate, daysAhead = 14 }: DateStripProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar' : 'en'
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: daysAhead }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() + index)
    return date
  })

  const todayIso = toLocalIsoDate(today)

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t('booking.selectADate')} className="flex gap-2 overflow-x-auto pb-1">
        {days.map((date) => {
          const iso = toLocalIsoDate(date)
          const { weekday, day } = shortLabel(date, locale)
          const isSelected = selectedDate === iso

          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectDate(iso)}
              className={cn(
                'flex min-w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-control border px-4 py-5 transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text hover:border-primary-300',
              )}
            >
              <span className="text-xs font-semibold tracking-wide uppercase opacity-70">{iso === todayIso ? t('booking.today') : weekday}</span>
              <span className="font-serif text-xl font-semibold">{day}</span>
              <span className="text-xs font-medium tracking-wide uppercase opacity-60">{weekday}</span>
            </button>
          )
        })}
      </div>

      <label htmlFor="booking-date-picker" className="text-xs font-semibold tracking-wide text-text-muted uppercase">
        {t('booking.orPickAnyDate')}
        <input
          id="booking-date-picker"
          type="date"
          min={todayIso}
          value={selectedDate ?? ''}
          onChange={(event) => {
            if (event.target.value) onSelectDate(event.target.value)
          }}
          className="mt-1.5 block w-full max-w-xs rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-text normal-case focus:border-primary focus:outline-none"
        />
      </label>
    </div>
  )
}
