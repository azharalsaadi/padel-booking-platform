import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  RefreshCw,
  Ticket,
  X,
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBookingByToken, useRetryPayment } from '@/hooks/useGuestBooking'
import { parseApiError } from '@/api/errors'
import { useToast } from '@/hooks/useToast'
import { formatBaisa } from '@/lib/money'
import type { BookingView } from '@/types/api'

type FailedBookingData = BookingView & {
  booking_reference?: string
  total_price_baisa?: number
  currency?: string
}

export function PaymentFailedPage() {
  const { token = '' } = useParams<{ token: string }>()
  const bookingQuery = useBookingByToken(token)
  const retryMutation = useRetryPayment(token)
  const { show } = useToast()

  function handleRetry() {
    retryMutation.mutate(undefined, {
      onSuccess: (booking) => {
        if (booking.checkout_url) {
          window.location.assign(booking.checkout_url)
          return
        }

        show({
          variant: 'error',
          title: 'Could not start payment',
          description: 'Please try again shortly.',
        })
      },
      onError: (error) => {
        show({
          variant: 'error',
          title: 'Could not start payment',
          description: parseApiError(error).message,
        })
      },
    })
  }

  if (bookingQuery.isLoading) {
    return (
      <Container className="flex min-h-[700px] flex-col items-center px-4 py-16">
        <Skeleton className="h-24 w-24 rounded-[18px]" />
        <Skeleton className="mt-7 h-14 w-full max-w-[430px]" />
        <Skeleton className="mt-4 h-6 w-full max-w-[520px]" />
        <Skeleton className="mt-10 h-[300px] w-full max-w-[740px] rounded-[12px]" />
      </Container>
    )
  }

  if (bookingQuery.isError) {
    return (
      <Container className="flex min-h-[650px] items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <ErrorMessage
            title="Payment was not completed"
            message="We also couldn't reload your booking. Use your original access link to try again."
          />
        </div>
      </Container>
    )
  }

  const booking = bookingQuery.data as FailedBookingData | undefined

  if (!booking) {
    return null
  }

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
      {/* Result navigation */}
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

        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f9dddd] px-5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#a52626]">
          <X
            aria-hidden="true"
            className="h-4 w-4"
            strokeWidth={2.2}
          />
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

      {/* Failed icon */}
      <div className="mt-10 flex h-[98px] w-[98px] items-center justify-center rounded-[18px] bg-[#f9dddd]">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[4px] border-[#a52626] text-[#a52626]">
          <X
            aria-hidden="true"
            className="h-7 w-7"
            strokeWidth={2.7}
          />
        </span>
      </div>

      {/* Heading */}
      <h1 className="mt-6 font-serif text-[44px] font-semibold leading-none tracking-[-0.04em] text-text sm:text-[56px]">
        Payment Failed
      </h1>

      <p className="mt-4 max-w-[620px] text-[16px] leading-7 text-text-muted sm:text-[18px]">
        Your payment could not be completed. No charge has been made.
        Your booking reference is still available below.
      </p>

      {/* Booking summary */}
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
              <span className="rounded-full bg-[#f9dddd] px-5 py-2 text-[11px] font-semibold uppercase text-[#a52626]">
                Failed
              </span>

              <span className="rounded-full bg-[#f0e4cd] px-5 py-2 text-[11px] font-semibold uppercase text-[#4e4235]">
                Not Paid
              </span>
            </div>
          </div>

          <div className="my-8 border-t border-border" />

          <div className="flex items-center gap-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#f1e4cf]">
              <AlertTriangle
                aria-hidden="true"
                className="h-6 w-6"
                strokeWidth={1.7}
              />
            </span>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Payment Status
              </p>

              <p className="mt-1 text-[14px] font-medium text-text sm:text-[16px]">
                The payment attempt was cancelled or could not be completed.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-4 bg-[#f5f3f1] px-5 py-5 sm:flex-row sm:items-center">
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-text-muted">
              Total Amount
            </span>

            <span className="font-serif text-[30px] font-semibold leading-none tracking-[-0.02em] text-text sm:text-[34px]">
              {totalAmount}
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-7 grid w-full max-w-[500px] gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleRetry}
          disabled={retryMutation.isPending}
          className="flex h-[56px] items-center justify-center gap-3 rounded-[5px] bg-black px-6 text-[15px] font-semibold text-white transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-[18px] w-[18px] ${
              retryMutation.isPending ? 'animate-spin' : ''
            }`}
            strokeWidth={1.8}
          />

          {retryMutation.isPending
            ? 'Preparing Payment...'
            : 'Try Payment Again'}
        </button>

        <Link
          to={`/booking/${token}`}
          className="flex h-[56px] items-center justify-center gap-3 rounded-[5px] border border-[#8f8982] bg-white px-6 text-[15px] font-medium text-text transition hover:bg-background"
        >
          <Ticket
            aria-hidden="true"
            className="h-[18px] w-[18px]"
            strokeWidth={1.8}
          />
          View Booking
        </Link>
      </div>

      <Link
        to="/book"
        className="mt-6 text-[14px] font-semibold text-text underline underline-offset-4"
      >
        Book Another Court
      </Link>
    </Container>
  )
}