import { describe, expect, it } from 'vitest'
import { formatDateLabel, formatTimeLabel, toLocalIsoDate } from '@/lib/datetime'

describe('formatTimeLabel', () => {
  it('formats a morning and an evening time', () => {
    expect(formatTimeLabel('09:00')).toBe('9:00 AM')
    expect(formatTimeLabel('18:00')).toBe('6:00 PM')
  })

  it('formats midnight and noon correctly', () => {
    expect(formatTimeLabel('00:00')).toBe('12:00 AM')
    expect(formatTimeLabel('12:00')).toBe('12:00 PM')
  })
})

describe('formatDateLabel', () => {
  it('formats an ISO date as a readable label', () => {
    expect(formatDateLabel('2026-08-05')).toBe('Wed, 5 Aug 2026')
  })
})

describe('toLocalIsoDate', () => {
  it('never shifts the calendar date via a UTC round-trip', () => {
    // A regression guard: date.toISOString().slice(0, 10) converts to UTC
    // first, which silently rolls local midnight back a day in any
    // timezone ahead of UTC (e.g. Oman, UTC+4). Building the string from
    // the Date's own local getters avoids that entirely.
    const localMidnight = new Date(2026, 7, 2, 0, 0, 0) // 2 Aug 2026, local time
    expect(toLocalIsoDate(localMidnight)).toBe('2026-08-02')
  })

  it('pads single-digit months and days', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
