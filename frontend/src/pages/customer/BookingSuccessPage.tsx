import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  Ticket,
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatBaisa } from '@/lib/money'
import type { BookingView } from '@/types/api'

interface LocationState {
  booking?: BookingView
}

type BookingSuccessData = BookingView & {
  booking_reference?: string
  booking_date?: string
  date?: string
  start_time?: string
  end_time?: string
  total_price_baisa?: number
  currency?: string
}

const THAWANI_REDIRECT_DELAY_MS = 3000

function formatBookingDate(value?: string) {
  if (!value) {
    return 'Date not available'
  }

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
  if (!value) {
    return ''
  }

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

export function BookingSuccessPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const booking = (location.state as LocationState | null)
    ?.booking as BookingSuccessData | undefined

  const isThawaniPending =
    booking?.payment_method === 'thawani' &&
    booking.booking_status === 'pending_payment'

  const isPayAtVenue =
    booking?.payment_method === 'pay_at_venue'

  const checkoutUrl = booking?.checkout_url

  useEffect(() => {
    if (!isThawaniPending || !checkoutUrl) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      window.location.assign(checkoutUrl)
    }, THAWANI_REDIRECT_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [isThawaniPending, checkoutUrl])

  if (!booking) {
    return (
      <Container className="py-12">
        <Card>
          <EmptyState
            title="No booking to show"
            description="This page is only reachable right after completing a booking."
            action={
              <Button onClick={() => navigate('/book')}>
                Book a Court
              </Button>
            }
          />
        </Card>
      </Container>
    )
  }

  if (isThawaniPending) {
    return (
      <Container className="flex min-h-[620px] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[18px] bg-[#e7f4ee]">
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-black border-t-transparent" />
        </div>

        <h1 className="mt-8 font-serif text-[44px] font-semibold tracking-[-0.035em] text-text sm:text-[54px]">
          Redirecting to Payment
        </h1>

        <p className="mt-4 max-w-lg text-[16px] leading-7 text-text-muted">
          Please wait while we securely redirect you to Thawani Sandbox.
        </p>

        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            className="mt-7 font-semibold text-text underline underline-offset-4"
          >
            Continue to Payment
          </a>
        ) : (
          <p
            role="alert"
            className="mt-7 max-w-lg rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            We couldn&apos;t start the online payment. Your booking
            reference is safe. Please open your booking to retry.
          </p>
        )}
      </Container>
    )
  }

  const bookingDate =
    booking.booking_date ?? booking.date

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
    booking.booking_reference ?? 'Reference unavailable'

  const totalAmount =
    typeof booking.total_price_baisa === 'number'
      ? formatBaisa(
          booking.total_price_baisa,
          booking.currency ?? 'OMR',
        )
      : 'OMR 0.000'

  return (
    <Container className="flex flex-col items-center px-4 pb-16 pt-12 text-center sm:pt-16 lg:pb-20">
      {/* Status navigation */}
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

        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f0e4cd] px-5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4e4235]">
          {isPayAtVenue && (
            <Check
              aria-hidden="true"
              className="h-4 w-4"
              strokeWidth={2.2}
            />
          )}
          3. Pay at Venue
        </span>
      </div>

      {/* Confirmation icon */}
      <div className="mt-10 flex h-[98px] w-[98px] items-center justify-center rounded-[18px] bg-[#e7f4ee]">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[4px] border-black">
          <Check
            aria-hidden="true"
            className="h-7 w-7"
            strokeWidth={2.7}
          />
        </span>
      </div>

      {/* Heading */}
      <h1 className="mt-6 font-serif text-[44px] font-semibold leading-none tracking-[-0.04em] text-text sm:text-[56px]">
        Booking Confirmed
      </h1>

      <p className="mt-4 max-w-[620px] text-[16px] leading-7 text-text-muted sm:text-[18px]">
        Your booking is reserved. Pay when you arrive at the venue.
      </p>

      {/* Booking card */}
      <section className="mt-10 w-full max-w-[740px]">
        <div className="rounded-[12px] border border-border bg-white px-7 py-8 text-left shadow-[0_10px_35px_rgba(0,0,0,0.035)] sm:px-10 sm:py-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Booking Reference
              </p>

              <p className="mt-2 break-all font-serif text-[28px] font-semibold leading-none tracking-[-0.025em] text-text sm:text-[34px]">
                {bookingReference}
              </p>
            </div>

            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <span className="rounded-full bg-black px-5 py-2 text-[11px] font-semibold uppercase text-white">
                Confirmed
              </span>

              <span className="rounded-full bg-[#f0e4cd] px-5 py-2 text-[11px] font-semibold uppercase text-[#4e4235]">
                Pay at Venue
              </span>
            </div>
          </div>

          <div className="my-8 border-t border-border" />

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

          <div className="mt-8 flex flex-col justify-between gap-4 bg-[#f5f3f1] px-5 py-5 sm:flex-row sm:items-center">
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-text-muted">
              Amount to Pay at Venue
            </span>

            <span className="font-serif text-[30px] font-semibold leading-none tracking-[-0.02em] text-text sm:text-[34px]">
              {totalAmount}
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-7 grid w-full max-w-[500px] gap-4 sm:grid-cols-2">
        {booking.access_token && (
          <button
            type="button"
            onClick={() =>
              navigate(`/booking/${booking.access_token}`)
            }
            className="flex h-[56px] items-center justify-center gap-3 rounded-[5px] bg-black px-6 text-[15px] font-semibold text-white transition hover:bg-[#292929]"
          >
            <Ticket
              aria-hidden="true"
              className="h-[18px] w-[18px]"
              strokeWidth={1.8}
            />
            View Booking
          </button>
        )}

        <Link
          to="/book"
          className="flex h-[56px] items-center justify-center rounded-[5px] border border-[#8f8982] bg-white px-6 text-[15px] font-medium text-text transition hover:bg-background"
        >
          Book Another Court
        </Link>
      </div>
    </Container>
  )
}