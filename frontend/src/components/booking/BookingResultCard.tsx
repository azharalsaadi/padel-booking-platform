import type { ReactNode } from 'react'
import type { BookingView } from '@/types/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatBaisa } from '@/lib/money'
import { formatDateLabel, formatTimeLabel } from '@/lib/datetime'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANTS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS } from '@/lib/status'
import { copyToClipboard } from '@/lib/clipboard'
import { useToast } from '@/hooks/useToast'

interface BookingResultCardProps {
  booking: BookingView
  /** Extra actions (cancel/retry/refresh buttons) rendered by the calling page. */
  actions?: ReactNode
}

function buildShareableSummary(booking: BookingView): string {
  const lines = [
    `Booking reference: ${booking.booking_reference}`,
    `Status: ${BOOKING_STATUS_LABELS[booking.booking_status]}`,
    `Total: ${formatBaisa(booking.total_price_baisa, booking.currency)}`,
    ...booking.slots.map(
      (slot) => `- ${formatDateLabel(slot.date)}, ${formatTimeLabel(slot.start_time)}-${formatTimeLabel(slot.end_time)}`,
    ),
  ]

  if (booking.access_token) {
    lines.push('', `Manage this booking: ${window.location.origin}/booking/${booking.access_token}`)
  }

  return lines.join('\n')
}

/**
 * Shared read-only display used by the success, processing, and manage
 * pages alike — booking.access_token is only ever present on the object
 * returned by booking creation, so rendering it conditionally on presence
 * (rather than a separate prop) is what keeps it off every other page by
 * construction, not by remembering to pass a flag.
 */
export function BookingResultCard({ booking, actions }: BookingResultCardProps) {
  const { show } = useToast()

  async function handleCopy() {
    const succeeded = await copyToClipboard(buildShareableSummary(booking))
    show({
      variant: succeeded ? 'success' : 'error',
      title: succeeded ? 'Copied to clipboard' : 'Could not copy',
      description: succeeded ? 'Booking details were copied.' : 'Please copy the details manually.',
    })
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Booking reference</p>
          <p className="font-serif text-xl font-semibold text-text">{booking.booking_reference}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={BOOKING_STATUS_VARIANTS[booking.booking_status]}>
            {BOOKING_STATUS_LABELS[booking.booking_status]}
          </Badge>
          {booking.payment_status && (
            <Badge variant={PAYMENT_STATUS_VARIANTS[booking.payment_status]}>
              {PAYMENT_STATUS_LABELS[booking.payment_status]}
            </Badge>
          )}
        </div>
      </div>

      {booking.access_token && (
        <div className="rounded-control border border-warning/40 bg-warning-50 p-4">
          <p className="text-sm font-semibold text-warning">Save this access link</p>
          <p className="mt-1 text-sm text-warning">
            You&apos;ll need it to view, cancel, or manage payment for this booking later. It won&apos;t be shown again.
          </p>
          <p className="mt-2 break-all rounded-control bg-surface px-3 py-2 font-mono text-xs text-text">
            {booking.access_token}
          </p>
        </div>
      )}

      {booking.hold_expires_at && booking.booking_status === 'pending_payment' && (
        <p role="status" className="text-sm text-warning">
          Complete payment before {new Date(booking.hold_expires_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}, or your slots will be released.
        </p>
      )}

      <div>
        <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">Date &amp; time</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {booking.slots.map((slot) => (
            <li
              key={`${slot.date}-${slot.start_time}`}
              className="flex items-center justify-between rounded-control border border-border px-4 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2 text-text">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-text-muted" fill="none">
                  <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
                {formatDateLabel(slot.date)}, {formatTimeLabel(slot.start_time)}&ndash;{formatTimeLabel(slot.end_time)}
              </span>
              <span className="text-text-muted">{formatBaisa(slot.price_baisa, booking.currency)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between rounded-control bg-background px-4 py-3 text-base font-semibold">
        <span className="text-text">Total</span>
        <span className="font-serif text-text">{formatBaisa(booking.total_price_baisa, booking.currency)}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleCopy}>
          Copy booking details
        </Button>
        {actions}
      </div>
    </Card>
  )
}
