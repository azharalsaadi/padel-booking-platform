/**
 * Formats a "HH:mm" 24h time string as a 12h display label, e.g. "18:00" ->
 * "6:00 PM". `locale` is optional and defaults to the existing English
 * behavior — every call site that doesn't pass it (including every admin
 * page) is unaffected; only the customer site's Arabic mode passes 'ar'.
 */
export function formatTimeLabel(time: string, locale: 'en' | 'ar' = 'en'): string {
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const isPm = hour >= 12
  const period = locale === 'ar' ? (isPm ? 'م' : 'ص') : isPm ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minuteStr} ${period}`
}

/**
 * Formats a "YYYY-MM-DD" date string as a readable label, e.g. "2026-08-05"
 * -> "Wed, 5 Aug 2026" (or the Arabic equivalent with Western digits, kept
 * consistent with how amounts are displayed, when `locale` is 'ar').
 */
export function formatDateLabel(date: string, locale: 'en' | 'ar' = 'en'): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Formats an ISO 8601 timestamp as a readable date + time label, e.g. "5 Aug 2026, 6:04 PM". */
export function formatDateTimeLabel(isoTimestamp: string, locale: 'en' | 'ar' = 'en'): string {
  return new Date(isoTimestamp).toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Formats a Date as "YYYY-MM-DD" using its LOCAL year/month/day.
 * Deliberately not `date.toISOString().slice(0, 10)` — toISOString()
 * converts to UTC first, which silently shifts the calendar date
 * backward by one day for any timezone ahead of UTC (e.g. Oman, UTC+4)
 * once the time has been zeroed to local midnight.
 */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
