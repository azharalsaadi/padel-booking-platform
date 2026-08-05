import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  Clock3,
  Download,
  Hourglass,
  MapPin,
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
  useDownloadBookingPdf,
  useRefreshPayment,
  useRetryPayment,
} from '@/hooks/useGuestBooking'
import { useToast } from '@/hooks/useToast'
import { formatBaisa } from '@/lib/money'
import type { TFunction } from 'i18next'

function formatBookingDate(value: string | undefined, locale: 'en' | 'ar', t: TFunction) {
  if (!value) {
    return t('manageBooking.dateNotAvailable')
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatBookingTime(value: string | undefined, locale: 'en' | 'ar') {
  if (!value) {
    return ''
  }

  const [hours = '0', minutes = '0'] = value.split(':')
  const isPm = Number(hours) >= 12
  const displayHour = Number(hours) % 12 === 0 ? 12 : Number(hours) % 12
  const period = locale === 'ar' ? (isPm ? 'م' : 'ص') : isPm ? 'PM' : 'AM'

  return `${displayHour}:${minutes} ${period}`
}

/** total_hours is the backend's own authoritative sum across every slot in the booking (BookingResource) — the only real duration field on BookingView. */
function formatDuration(totalHours: number | undefined, t: TFunction) {
  if (typeof totalHours !== 'number' || !Number.isFinite(totalHours) || totalHours <= 0) {
    return t('manageBooking.durationNotAvailable')
  }

  return t('manageBooking.durationHours', { count: totalHours })
}

export function ManageBookingPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar' : 'en'
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { show } = useToast()

  // Pay at Venue payment is confirmed by an admin, out-of-band from this
  // page — polling is the only way this customer sees "Paid" without a
  // manual refresh. Re-evaluated after every fetch against the latest
  // cached data, so it stops itself the moment payment_status flips to
  // 'paid' (or the booking is cancelled/expired) without any extra state.
  const bookingQuery = useBookingByToken(token, {
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false

      const isPayAtVenuePending = data.payment_method === 'pay_at_venue' && data.payment_status !== 'paid'
      const isResolved = data.booking_status === 'cancelled' || data.booking_status === 'expired'

      return isPayAtVenuePending && !isResolved ? 5000 : false
    },
  })
  const cancelMutation = useCancelBooking(token)
  const retryMutation = useRetryPayment(token)
  const refreshMutation = useRefreshPayment(token)
  const downloadPdfMutation = useDownloadBookingPdf(token)

  const [bookingSearch, setBookingSearch] = useState('')

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
          title: t('manageBooking.bookingCancelledToastTitle'),
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
          title: t('manageBooking.newPaymentLinkToastTitle'),
        })
      },

      onError: (error) => {
        const parsed = parseApiError(error)

        setActionError(parsed.message)

        show({
          variant: 'error',
          title: t('manageBooking.couldNotStartPaymentTitle'),
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
          title: t('manageBooking.paymentStatusUpdatedToastTitle'),
        })
      },

      onError: (error) => {
        const parsed = parseApiError(error)

        setActionError(parsed.message)

        show({
          variant: 'error',
          title: t('manageBooking.couldNotRefreshStatusTitle'),
          description: parsed.message,
        })
      },
    })
  }

  function handleDownloadPdf() {
    downloadPdfMutation.mutate(undefined, {
      onSuccess: ({ blob, filename }) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      },
      onError: (error) => {
        show({
          variant: 'error',
          title: t('manageBooking.pdfDownloadFailedTitle'),
          description: parseApiError(error).message,
        })
      },
    })
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
                ? t('manageBooking.bookingNotFoundTitle')
                : t('manageBooking.couldNotLoadTitle')
            }
            message={
              notFound
                ? t('manageBooking.bookingNotFoundMessage')
                : parsed.message
            }
            action={
              !notFound && (
                <Button
                  size="sm"
                  onClick={() => bookingQuery.refetch()}
                >
                  {t('manageBooking.tryAgain')}
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

  const formattedDate = formatBookingDate(primarySlot?.date, locale, t)

  const formattedStartTime = formatBookingTime(
    primarySlot?.start_time,
    locale,
  )

  const formattedEndTime = formatBookingTime(
    primarySlot?.end_time,
    locale,
  )

  const timeRange =
    formattedStartTime && formattedEndTime
      ? `${formattedStartTime} – ${formattedEndTime}`
      : formattedStartTime ||
        formattedEndTime ||
        t('manageBooking.timeNotAvailable')

  // total_hours is the backend's own sum across every slot, so it stays
  // correct even for multi-slot bookings the single Date/Time row above
  // can't fully represent.
  const duration = formatDuration(booking.total_hours, t)

  const bookingReference =
    booking.booking_reference ?? token

  const totalAmount =
    typeof booking.total_price_baisa === 'number'
      ? formatBaisa(
          booking.total_price_baisa,
          booking.currency ?? 'OMR',
        )
      : t('errors.genericAmount')

  const paymentLabel = isPaid
    ? t('manageBooking.paid')
    : isFailed
      ? t('manageBooking.failed')
      : t('manageBooking.pending')

  const bookingStatusLabel =
    isPaid && isConfirmed
      ? t('manageBooking.confirmed')
      : isFailed
        ? t('manageBooking.notPaid')
        : t('manageBooking.pending')

  return (
    <Container className="flex flex-col items-center px-4 pb-16 pt-16 sm:pt-20 lg:pb-24 lg:pt-24">
      {/* Heading */}
      <header className="text-center">
        <h1 className="font-serif text-[46px] font-semibold leading-none tracking-[-0.04em] text-text sm:text-[58px]">
          {t('manageBooking.title')}
        </h1>

        {isPaid ? (
          <p className="mx-auto mt-6 max-w-[560px] text-[16px] leading-7 text-text-muted sm:text-[18px]">
            {t('manageBooking.subtitlePaid')}
          </p>
        ) : (
          <p className="mx-auto mt-6 max-w-[520px] text-[16px] leading-7 text-text-muted sm:text-[18px]">
            {t('manageBooking.subtitleDefault')}
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
              {t('manageBooking.bookingReferenceLabel')}
            </span>

            <input
              type="text"
              value={bookingSearch}
              onChange={(event) =>
                setBookingSearch(event.target.value)
              }
              placeholder={t('manageBooking.enterBookingReference')}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
            />
          </label>

          <button
            type="submit"
            className="h-[56px] rounded-[5px] bg-black px-8 text-[15px] font-semibold text-white transition hover:bg-[#292929]"
          >
            {t('manageBooking.viewBookingButton')}
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
          {t('manageBooking.newPaymentLinkReady')}{' '}

          <a
            href={retryMutation.data.checkout_url}
            className="font-semibold text-text underline underline-offset-4"
          >
            {t('manageBooking.continueToThawani')}
          </a>
        </div>
      )}

      {/* Booking summary */}
      <section className="mt-10 w-full max-w-[720px]">
        <div className="rounded-[10px] border border-border bg-white px-7 py-9 shadow-[0_10px_35px_rgba(0,0,0,0.025)] sm:px-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a7555]">
                {t('manageBooking.bookingSummary')}
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
              label={t('manageBooking.bookingReference')}
              value={bookingReference}
            />

            {isPaid && isConfirmed && primarySlot?.court_name && (
              <BookingDetailRow
                icon={<MapPin className="h-5 w-5" />}
                label={t('manageBooking.court')}
                value={primarySlot.court_name}
              />
            )}

            <BookingDetailRow
              icon={<CalendarDays className="h-5 w-5" />}
              label={t('manageBooking.date')}
              value={formattedDate}
            />

            <BookingDetailRow
              icon={<Clock3 className="h-5 w-5" />}
              label={t('manageBooking.time')}
              value={timeRange}
            />

            <BookingDetailRow
              icon={<Hourglass className="h-5 w-5" />}
              label={t('manageBooking.duration')}
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

              {t('manageBooking.refreshPaymentStatus')}
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
                ? t('manageBooking.preparingPayment')
                : t('manageBooking.retryPayment')}
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

              {t('manageBooking.cancelBooking')}
            </button>
          )}
        </div>
      )}

      {/* PDF appears only after successful payment */}
      {isPaid && (
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloadPdfMutation.isPending}
          className="mt-10 flex h-[58px] w-full max-w-[720px] items-center justify-center gap-4 rounded-[5px] bg-black px-7 text-[16px] font-semibold text-white transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download
            aria-hidden="true"
            className={`h-6 w-6 ${downloadPdfMutation.isPending ? 'animate-pulse' : ''}`}
            strokeWidth={1.9}
          />

          {downloadPdfMutation.isPending
            ? t('manageBooking.preparingPdf')
            : t('manageBooking.downloadBookingPdf')}
        </button>
      )}

      <Modal
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={t('manageBooking.cancelModalTitle')}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setIsCancelModalOpen(false)
              }
            >
              {t('manageBooking.keepBooking')}
            </Button>

            <Button
              variant="danger"
              onClick={handleCancelConfirmed}
              isLoading={cancelMutation.isPending}
            >
              {t('manageBooking.cancelBooking')}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-text-muted">
          {t('manageBooking.cancelModalBody')}
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
