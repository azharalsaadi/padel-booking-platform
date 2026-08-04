import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  RefreshCw,
  Ticket,
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBookingByToken, useRefreshPayment } from '@/hooks/useGuestBooking'
import { parseApiError } from '@/api/errors'
import { formatBaisa } from '@/lib/money'
import type { BookingView } from '@/types/api'

type ProcessingBooking = BookingView & {
  booking_reference?: string
  booking_date?: string
  date?: string
  start_time?: string
  end_time?: string
  total_price_baisa?: number
  currency?: string
}

function formatBookingDate(value?: string) {
  if (!value) return 'Date not available'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatBookingTime(value?: string) {
  if (!value) return ''

  const [hours = '0', minutes = '0'] = value.split(':')
  const date = new Date()

  date.setHours(Number(hours), Number(minutes), 0, 0)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * Thawani redirects to this page after payment.
 * The backend is always queried again before the booking is shown as paid.
 */
export function ProcessingPage() {
  const { token = '' } = useParams<{ token: string }>()

  const bookingQuery = useBookingByToken(token)
  const refreshMutation = useRefreshPayment(token)
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (hasTriggered.current || !token) {
      return
    }

    hasTriggered.current = true
    refreshMutation.mutate()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (bookingQuery.isLoading) {
    return (
      <Container className="flex min-h-[620px] flex-col items-center px-4 py-16">
        <Skeleton className="h-24 w-24 rounded-[18px]" />
        <Skeleton className="mt-7 h-14 w-full max-w-[430px]" />
        <Skeleton className="mt-4 h-6 w-full max-w-[500px]" />
        <Skeleton className="mt-10 h-[340px] w-full max-w-[740px] rounded-[12px]" />
      </Container>
    )
  }

  if (bookingQuery.isError) {
    return (
      <Container className="flex min-h-[620px] items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <ErrorMessage
            title="Could not load your booking"
            message="We couldn't find this booking. Your payment reference is unaffected. Please check your booking access link."
          />
        </div>
      </Container>
    )
  }

  const booking = (
    refreshMutation.data ?? bookingQuery.data
  ) as ProcessingBooking | undefined

  if (!booking) {
    return null
  }

  const isConfirmedAndPaid =
    booking.booking_status === 'confirmed' &&
    booking.payment_status === 'paid'

  const bookingDate =
    booking.booking_date ??
    booking.date

  const formattedDate = formatBookingDate(bookingDate)
  const formattedStartTime = formatBookingTime(booking.start_time)
  const formattedEndTime = formatBookingTime(booking.end_time)

  const timeRange =
    formattedStartTime && formattedEndTime
      ? `${formattedStartTime} – ${formattedEndTime}`
      : formattedStartTime ||
        formattedEndTime ||
        'Time not available'

  const bookingReference =
    booking.booking_reference ??
    'Reference unavailable'

  const totalAmount =
    typeof booking.total_price_baisa === 'number'
      ? formatBaisa(
          booking.total_price_baisa,
          booking.currency ?? 'OMR',
        )
      : 'OMR 0.000'

  return (
    <Container className="flex flex-col items-center px-4 pb-16 pt-12 text-center sm:pt-16 lg:pb-20">
      {/* Payment result navigation */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#dff3e9] px-5 text-[12px] font-semibold uppercase tracking-[0.04em] text-black">
          <Check
            aria-hidden="true"
            className="h-4 w-4"
            strokeWidth={2.2}
          />
          1. Success
        </span>

        <span
          aria-hidden="true"
          className="hidden h-px w-9 bg-black sm:block"
        />

        <span className="inline-flex h-10 items-center rounded-full bg-[#f9dddd] px-5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#a52626]">
          2. Failed
        </span>

        <span
          aria-hidden="true"
          className="hidden h-px w-9 bg-black sm:block"
        />

        <span className="inline-flex h-10 items-center rounded-full bg-[#f0e4cd] px-5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4e4235]">
          3. Pay at Venue
        </span>
      </div>

      {/* Result icon */}
      <div className="mt-10 flex h-[98px] w-[98px] items-center justify-center rounded-[18px] bg-[#ccefe1]">
        {isConfirmedAndPaid ? (
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[4px] border-black">
            <Check
              aria-hidden="true"
              className="h-7 w-7"
              strokeWidth={2.7}
            />
          </span>
        ) : (
          <RefreshCw
            aria-hidden="true"
            className="h-10 w-10 animate-spin"
            strokeWidth={1.8}
          />
        )}
      </div>

      {/* Heading */}
      <h1 className="mt-6 font-serif text-[44px] font-semibold leading-none tracking-[-0.04em] text-text sm:text-[56px]">
        {isConfirmedAndPaid
          ? 'Payment Successful'
          : 'Confirming Your Payment'}
      </h1>

      <p className="mt-4 max-w-[620px] text-[16px] text-text-muted sm:text-[18px]">
        {isConfirmedAndPaid
          ? "Your booking is confirmed. We've sent the details to your email."
          : 'Please wait while we securely confirm your payment with Thawani.'}
      </p>

      {/* Refresh status */}
      {refreshMutation.isPending && (
        <p
          role="status"
          className="mt-5 flex items-center justify-center gap-2 text-[14px] text-text-muted"
        >
          <RefreshCw
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
          />
          Checking your payment status with Thawani...
        </p>
      )}

      {refreshMutation.isError && (
        <div className="mt-6 w-full max-w-[740px]">
          <ErrorMessage
            title="Could not confirm payment yet"
            message={parseApiError(refreshMutation.error).message}
            action={
              <button
                type="button"
                onClick={() => refreshMutation.mutate()}
                className="rounded-[5px] bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#292929]"
              >
                Check Again
              </button>
            }
          />
        </div>
      )}

      {/* Booking summary */}
      <section className="mt-10 w-full max-w-[740px]">
        <div className="rounded-[12px] border border-border bg-white px-7 py-8 text-left shadow-[0_10px_35px_rgba(0,0,0,0.035)] sm:px-10 sm:py-9">
          {/* Reference and statuses */}
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Booking Reference
              </p>

              <p className="mt-2 break-all font-serif text-[27px] font-semibold leading-none tracking-[-0.025em] text-text sm:text-[34px]">
                {bookingReference}
              </p>
            </div>

            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <span className="rounded-full bg-black px-5 py-2 text-[11px] font-semibold uppercase text-white">
                {booking.booking_status === 'confirmed'
                  ? 'Confirmed'
                  : 'Pending'}
              </span>

              <span className="rounded-full bg-[#ccefe1] px-5 py-2 text-[11px] font-semibold uppercase text-black">
                {booking.payment_status === 'paid'
                  ? 'Paid'
                  : 'Processing'}
              </span>
            </div>
          </div>

          <div className="my-8 border-t border-border" />

          {/* Date and time */}
          <div className="flex items-center gap-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#f1e4cf]">
              <CalendarDays
                aria-hidden="true"
                className="h-6 w-6"
                strokeWidth={1.7}
              />
            </span>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Date &amp; Time
              </p>

              <p className="mt-1 text-[14px] font-medium text-text sm:text-[16px]">
                {formattedDate} | {timeRange}
              </p>
            </div>
          </div>

          {/* Total amount */}
          <div className="mt-8 flex flex-col justify-between gap-4 bg-[#f5f3f1] px-5 py-5 sm:flex-row sm:items-center">
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-text-muted">
              Total Amount Paid
            </span>

            <span className="font-serif text-[29px] font-semibold leading-none tracking-[-0.02em] text-text sm:text-[34px]">
              {totalAmount}
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      {isConfirmedAndPaid ? (
        <div className="mt-7 grid w-full max-w-[500px] gap-4 sm:grid-cols-2">
          <Link
            to={`/booking/${token}`}
            className="flex h-[56px] items-center justify-center gap-3 rounded-[5px] bg-black px-6 text-[15px] font-semibold text-white transition hover:bg-[#292929]"
          >
            <Ticket
              aria-hidden="true"
              className="h-[18px] w-[18px]"
              strokeWidth={1.8}
            />
            View Booking
          </Link>

          <Link
            to="/book"
            className="flex h-[56px] items-center justify-center rounded-[5px] border border-[#8f8982] bg-white px-6 text-[15px] font-medium text-text transition hover:bg-background"
          >
            Book Another Court
          </Link>
        </div>
      ) : (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[5px] bg-black px-6 text-[14px] font-semibold text-white transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${
                refreshMutation.isPending ? 'animate-spin' : ''
              }`}
            />
            Check Again
          </button>

          <Link
            to={`/booking/${token}`}
            className="inline-flex h-[52px] items-center justify-center rounded-[5px] border border-border bg-white px-6 text-[14px] font-medium text-text transition hover:bg-background"
          >
            Go to Your Booking
          </Link>
        </div>
      )}
    </Container>
  )
}