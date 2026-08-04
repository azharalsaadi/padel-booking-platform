import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  Download,
  Hourglass,
  RefreshCw,
  Ticket,
  X,
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { parseApiError } from '@/api/errors'
import {
  useBookingByToken,
  useCancelBooking,
  useRefreshPayment,
  useRetryPayment,
} from '@/hooks/useGuestBooking'
import { useToast } from '@/hooks/useToast'
import { formatBaisa } from '@/lib/money'

function formatBookingDate(value?: string) {
  if (!value) {
    return 'Date not available'
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

/** total_hours is the backend's own authoritative sum across every slot in the booking (BookingResource) — the only real duration field on BookingView. */
function formatDuration(totalHours?: number) {
  if (typeof totalHours !== 'number' || !Number.isFinite(totalHours) || totalHours <= 0) {
    return 'Not available'
  }

  if (totalHours < 1) {
    return `${Math.round(totalHours * 60)} minutes`
  }

  return `${totalHours} ${totalHours === 1 ? 'hour' : 'hours'}`
}

export function ManageBookingPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { show } = useToast()

  const bookingQuery = useBookingByToken(token)
  const cancelMutation = useCancelBooking(token)
  const retryMutation = useRetryPayment(token)
  const refreshMutation = useRefreshPayment(token)

  const [bookingSearch, setBookingSearch] = useState(token)

  const [isCancelModalOpen, setIsCancelModalOpen] =
    useState(false)

  const [actionError, setActionError] = useState<
    string | null
  >(null)

  function handleBookingSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const value = bookingSearch.trim()

    if (!value) {
      return
    }

    navigate(`/booking/${encodeURIComponent(value)}`)
  }

  function handleCancelConfirmed() {
    setActionError(null)

    cancelMutation.mutate(undefined, {
      onSuccess: () => {
        setIsCancelModalOpen(false)

        show({
          variant: 'success',
          title: 'Booking cancelled',
        })
      },

      onError: (error) => {
        setIsCancelModalOpen(false)
        setActionError(parseApiError(error).message)
      },
    })
  }

  function handleRetryPayment() {
    setActionError(null)

    retryMutation.mutate(undefined, {
      onSuccess: () => {
        show({
          variant: 'success',
          title: 'New payment link ready',
        })
      },

      onError: (error) => {
        const parsed = parseApiError(error)

        setActionError(parsed.message)

        show({
          variant: 'error',
          title: 'Could not start payment',
          description: parsed.message,
        })
      },
    })
  }

  function handleRefreshPayment() {
    setActionError(null)

    refreshMutation.mutate(undefined, {
      onSuccess: () => {
        show({
          variant: 'info',
          title: 'Payment status updated',
        })
      },

      onError: (error) => {
        const parsed = parseApiError(error)

        setActionError(parsed.message)

        show({
          variant: 'error',
          title: 'Could not refresh payment status',
          description: parsed.message,
        })
      },
    })
  }

  function handleDownloadPdf() {
    window.print()
  }

  if (bookingQuery.isLoading) {
    return (
      <Container className="flex min-h-[700px] flex-col items-center px-4 py-16">
        <Skeleton className="h-14 w-full max-w-[520px]" />
        <Skeleton className="mt-5 h-6 w-full max-w-[500px]" />
        <Skeleton className="mt-10 h-[450px] w-full max-w-[720px] rounded-[12px]" />
      </Container>
    )
  }

  if (bookingQuery.isError) {
    const parsed = parseApiError(bookingQuery.error)
    const notFound = parsed.status === 404

    return (
      <Container className="flex min-h-[650px] items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <ErrorMessage
            title={
              notFound
                ? 'Booking not found'
                : 'Could not load your booking'
            }
            message={
              notFound
                ? "We couldn't find a booking for this access code. Double-check the link and try again."
                : parsed.message
            }
            action={
              !notFound && (
                <Button
                  size="sm"
                  onClick={() => bookingQuery.refetch()}
                >
                  Try Again
                </Button>
              )
            }
          />
        </div>
      </Container>
    )
  }

  const booking = bookingQuery.data

  if (!booking) {
    return null
  }

  const isPaid = booking.payment_status === 'paid'

  const isConfirmed =
    booking.booking_status === 'confirmed'

  const isFailed =
    booking.payment_status === 'failed' ||
    booking.booking_status === 'cancelled' ||
    booking.booking_status === 'expired'

  const canRetryPayment =
    booking.payment_method === 'thawani' &&
    booking.booking_status === 'pending_payment'

  const canRefreshPayment = canRetryPayment

  const canCancel =
    booking.booking_status !== 'cancelled' &&
    booking.booking_status !== 'expired' &&
    !(
      booking.payment_method === 'thawani' &&
      booking.booking_status === 'confirmed'
    ) &&
    !(
      booking.payment_method === 'pay_at_venue' &&
      isPaid
    )

  // BookingView carries no top-level date/time — every slot lives in
  // `slots` (BookingResource), sorted here the same way the booking flow
  // itself sorts them, so the earliest session is what's shown.
  const sortedSlots = [...booking.slots].sort((a, b) =>
    a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date),
  )
  const primarySlot = sortedSlots[0]

  const formattedDate = formatBookingDate(primarySlot?.date)

  const formattedStartTime = formatBookingTime(
    primarySlot?.start_time,
  )

  const formattedEndTime = formatBookingTime(
    primarySlot?.end_time,
  )

  const timeRange =
    formattedStartTime && formattedEndTime
      ? `${formattedStartTime} – ${formattedEndTime}`
      : formattedStartTime ||
        formattedEndTime ||
        'Time not available'

  // total_hours is the backend's own sum across every slot, so it stays
  // correct even for multi-slot bookings the single Date/Time row above
  // can't fully represent.
  const duration = formatDuration(booking.total_hours)

  const bookingReference =
    booking.booking_reference ?? token

  const totalAmount =
    typeof booking.total_price_baisa === 'number'
      ? formatBaisa(
          booking.total_price_baisa,
          booking.currency ?? 'OMR',
        )
      : 'OMR 0.000'

  const paymentLabel = isPaid
    ? 'Paid'
    : isFailed
      ? 'Failed'
      : 'Pending'

  const bookingStatusLabel =
    isPaid && isConfirmed
      ? 'Confirmed'
      : isFailed
        ? 'Not Paid'
        : 'Pending'

  return (
    <Container className="flex flex-col items-center px-4 pb-16 pt-16 sm:pt-20 lg:pb-24 lg:pt-24">
      {/* Heading */}
      <header className="text-center">
        <h1 className="font-serif text-[46px] font-semibold leading-none tracking-[-0.04em] text-text sm:text-[58px]">
          View Your Booking
        </h1>

        {isPaid ? (
          <p className="mx-auto mt-6 max-w-[560px] text-[16px] leading-7 text-text-muted sm:text-[18px]">
            View your booking details, payment status,
            <br className="hidden sm:block" />
            and download your booking confirmation.
          </p>
        ) : (
          <p className="mx-auto mt-6 max-w-[520px] text-[16px] leading-7 text-text-muted sm:text-[18px]">
            Review your booking details and payment status.
          </p>
        )}
      </header>

      {/* Search appears only after successful payment */}
      {isPaid && (
        <form
          onSubmit={handleBookingSearch}
          className="mt-10 flex w-full max-w-[640px] flex-col gap-4 rounded-[6px] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] sm:flex-row"
        >
          <label className="flex h-[56px] flex-1 items-center gap-4 rounded-[5px] border border-border px-5">
            <Ticket
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
              strokeWidth={1.7}
            />

            <span className="sr-only">
              Booking reference
            </span>

            <input
              type="text"
              value={bookingSearch}
              onChange={(event) =>
                setBookingSearch(event.target.value)
              }
              placeholder="Enter Booking Reference"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
            />
          </label>

          <button
            type="submit"
            className="h-[56px] rounded-[5px] bg-black px-8 text-[15px] font-semibold text-white transition hover:bg-[#292929]"
          >
            View Booking
          </button>
        </form>
      )}

      {actionError && (
        <div className="mt-6 w-full max-w-[720px]">
          <ErrorMessage message={actionError} />
        </div>
      )}

      {retryMutation.data?.checkout_url && (
        <div className="mt-6 w-full max-w-[720px] rounded-[8px] border border-border bg-white px-5 py-4 text-center text-sm text-text-muted">
          Your new payment link is ready.{' '}

          <a
            href={retryMutation.data.checkout_url}
            className="font-semibold text-text underline underline-offset-4"
          >
            Continue to Thawani
          </a>
        </div>
      )}

      {/* Booking summary */}
      <section className="mt-10 w-full max-w-[720px]">
        <div className="rounded-[10px] border border-border bg-white px-7 py-9 shadow-[0_10px_35px_rgba(0,0,0,0.025)] sm:px-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a7555]">
                Booking Summary
              </p>

              <p className="mt-4 font-serif text-[38px] font-semibold leading-none tracking-[-0.03em] text-text sm:text-[46px]">
                {totalAmount}
              </p>
            </div>

            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <span
                className={
                  isPaid
                    ? 'rounded-full bg-[#ccefe1] px-5 py-2 text-[11px] font-semibold uppercase text-black'
                    : isFailed
                      ? 'rounded-full bg-[#f9dddd] px-5 py-2 text-[11px] font-semibold uppercase text-[#a52626]'
                      : 'rounded-full bg-[#f0e4cd] px-5 py-2 text-[11px] font-semibold uppercase text-[#4e4235]'
                }
              >
                {paymentLabel}
              </span>

              <span
                className={
                  isPaid
                    ? 'rounded-full bg-black px-5 py-2 text-[11px] font-semibold uppercase text-white'
                    : 'rounded-full bg-[#f0e4cd] px-5 py-2 text-[11px] font-semibold uppercase text-[#4e4235]'
                }
              >
                {bookingStatusLabel}
              </span>
            </div>
          </div>

          <div className="my-9 border-t border-border" />

          <div className="divide-y divide-border">
            <BookingDetailRow
              icon={<Ticket className="h-5 w-5" />}
              label="Booking Reference"
              value={bookingReference}
            />

            <BookingDetailRow
              icon={<CalendarDays className="h-5 w-5" />}
              label="Date"
              value={formattedDate}
            />

            <BookingDetailRow
              icon={<Clock3 className="h-5 w-5" />}
              label="Time"
              value={timeRange}
            />

            <BookingDetailRow
              icon={<Hourglass className="h-5 w-5" />}
              label="Duration"
              value={duration}
            />
          </div>
        </div>
      </section>

      {/* Payment and booking actions */}
      {(canRefreshPayment ||
        canRetryPayment ||
        canCancel) && (
        <div className="mt-7 flex w-full max-w-[720px] flex-wrap justify-center gap-3">
          {canRefreshPayment && (
            <button
              type="button"
              onClick={handleRefreshPayment}
              disabled={refreshMutation.isPending}
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[5px] border border-border bg-white px-5 text-sm font-semibold text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshMutation.isPending
                    ? 'animate-spin'
                    : ''
                }`}
              />

              Refresh Payment Status
            </button>
          )}

          {canRetryPayment && (
            <button
              type="button"
              onClick={handleRetryPayment}
              disabled={retryMutation.isPending}
              className="h-[50px] rounded-[5px] bg-black px-7 text-sm font-semibold text-white transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryMutation.isPending
                ? 'Preparing Payment...'
                : 'Retry Payment'}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() =>
                setIsCancelModalOpen(true)
              }
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[5px] border border-black bg-black px-7 text-sm font-semibold text-white transition hover:bg-[#292929]"
            >
              <X
                aria-hidden="true"
                className="h-4 w-4 text-white"
                strokeWidth={2}
              />

              Cancel Booking
            </button>
          )}
        </div>
      )}

      {/* PDF appears only after successful payment */}
      {isPaid && (
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="mt-10 flex h-[58px] w-full max-w-[720px] items-center justify-center gap-4 rounded-[5px] bg-black px-7 text-[16px] font-semibold text-white transition hover:bg-[#292929]"
        >
          <Download
            aria-hidden="true"
            className="h-6 w-6"
            strokeWidth={1.9}
          />

          Download Booking PDF
        </button>
      )}

      <Modal
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel this booking?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setIsCancelModalOpen(false)
              }
            >
              Keep Booking
            </Button>

            <Button
              variant="danger"
              onClick={handleCancelConfirmed}
              isLoading={cancelMutation.isPending}
            >
              Cancel Booking
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-text-muted">
          This releases all your reserved times. This
          cannot be undone, and no refund is issued
          automatically.
        </p>
      </Modal>
    </Container>
  )
}

type BookingDetailRowProps = {
  icon: ReactNode
  label: string
  value: string
}

function BookingDetailRow({
  icon,
  label,
  value,
}: BookingDetailRowProps) {
  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] bg-[#f2ebe5] text-text">
          {icon}
        </span>

        <span className="text-[14px] font-medium text-text">
          {label}
        </span>
      </div>

      <span className="break-all pl-14 text-[14px] font-medium text-text sm:pl-0 sm:text-right">
        {value}
      </span>
    </div>
  )
}