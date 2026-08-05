import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAdminBooking, useMarkBookingPaid } from '@/hooks/admin/useAdminBookings'
import { useToast } from '@/hooks/useToast'
import { parseApiError } from '@/api/errors'
import { formatBaisa } from '@/lib/money'
import { formatDateLabel, formatDateTimeLabel, formatTimeLabel } from '@/lib/datetime'
import { getBookingStatusLabel, getPaymentStatusLabel, BOOKING_STATUS_VARIANTS, PAYMENT_STATUS_VARIANTS } from '@/lib/status'
import type { TFunction } from 'i18next'
import type { AdminBooking } from '@/types/admin'

/** Court shown as "—" whenever a booking spans more than one distinct court. */
function courtSummary(booking: AdminBooking, t: TFunction): string {
  const names = [...new Set(booking.slots.map((slot) => slot.court_name).filter((name): name is string => Boolean(name)))]
  if (names.length === 0) return '—'
  if (names.length === 1) return names[0]
  return t('admin.bookingDetail.multipleCourtsSuffix', { count: names.length })
}

function canMarkPaid(booking: AdminBooking): boolean {
  return booking.payment_method === 'pay_at_venue' && booking.payment_status === 'pending'
}

export function BookingDetailPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams<{ id: string }>()
  const bookingId = Number(id)
  const bookingQuery = useAdminBooking(bookingId)
  const markPaidMutation = useMarkBookingPaid(bookingId)
  const { show } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleConfirmMarkPaid() {
    markPaidMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        show({ variant: 'success', title: t('admin.bookingDetail.paymentConfirmedTitle'), description: t('admin.bookingDetail.paymentConfirmedDescription') })
      },
      onError: (error) => {
        setConfirmOpen(false)
        show({ variant: 'error', title: t('admin.bookingDetail.couldNotConfirmPayment'), description: parseApiError(error).message })
      },
    })
  }

  if (bookingQuery.isLoading) {
    return (
      <Container className="py-2">
        <Card aria-busy="true" aria-label={t('admin.bookingDetail.loadingBooking')}>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="mt-4 h-32 w-full" />
        </Card>
      </Container>
    )
  }

  if (bookingQuery.isError) {
    return (
      <Container className="py-2">
        <ErrorMessage
          message={t('admin.bookingDetail.couldNotLoad')}
          action={
            <Button size="sm" onClick={() => bookingQuery.refetch()}>
              {t('admin.bookingDetail.tryAgain')}
            </Button>
          }
        />
      </Container>
    )
  }

  const booking = bookingQuery.data

  if (!booking) {
    return null
  }

  return (
    <Container className="flex flex-col gap-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">{booking.booking_reference}</h1>
        <Link to="/admin/bookings" className="text-sm font-medium text-primary-700 underline">
          {t('admin.bookingDetail.backToBookings')}
        </Link>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={BOOKING_STATUS_VARIANTS[booking.booking_status]}>{getBookingStatusLabel(booking.booking_status, t)}</Badge>
          {booking.payment_status && (
            <Badge variant={PAYMENT_STATUS_VARIANTS[booking.payment_status]}>
              {t('admin.bookingDetail.paymentLabel', { status: getPaymentStatusLabel(booking.payment_status, t) })}
            </Badge>
          )}
          <Badge variant="neutral">{booking.payment_method === 'thawani' ? t('admin.common.thawani') : t('admin.common.payAtVenue')}</Badge>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-muted">{t('admin.bookingDetail.customerName')}</dt>
            <dd className="text-text">{booking.customer_name ?? t('admin.bookingDetail.guest')}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">{t('admin.bookingDetail.customerPhone')}</dt>
            <dd className="text-text">{booking.customer_phone}</dd>
          </div>
          {booking.customer_email && (
            <div>
              <dt className="text-sm text-text-muted">{t('admin.bookingDetail.customerEmail')}</dt>
              <dd className="text-text">{booking.customer_email}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-text-muted">{t('admin.bookingDetail.court')}</dt>
            <dd className="text-text">{courtSummary(booking, t)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">{t('admin.bookingDetail.totalPrice')}</dt>
            <dd className="text-text">{formatBaisa(booking.total_price_baisa, booking.currency)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">{t('admin.bookingDetail.createdAt')}</dt>
            <dd className="text-text">{booking.created_at ? formatDateTimeLabel(booking.created_at) : '—'}</dd>
          </div>
          {booking.paid_at && (
            <div>
              <dt className="text-sm text-text-muted">{t('admin.bookingDetail.paymentTime')}</dt>
              <dd className="text-text">{formatDateTimeLabel(booking.paid_at)}</dd>
            </div>
          )}
          {booking.notes && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-text-muted">{t('admin.bookingDetail.notes')}</dt>
              <dd className="text-text">{booking.notes}</dd>
            </div>
          )}
        </dl>

        {canMarkPaid(booking) && (
          <div className="pt-2">
            <Button onClick={() => setConfirmOpen(true)}>{t('admin.bookingDetail.markAsPaid')}</Button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-text">{t('admin.bookingDetail.slotsTitle')}</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {booking.slots.map((slot) => (
            <li
              key={`${slot.date}-${slot.start_time}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-4 py-3 text-sm"
            >
              <span className="text-text">
                {formatDateLabel(slot.date)}, {formatTimeLabel(slot.start_time)}&ndash;{formatTimeLabel(slot.end_time)}
              </span>
              <span className="text-text-muted">
                {t('admin.bookingDetail.court')}: {slot.court_name ?? t('admin.bookingDetail.unassigned')}
              </span>
              <span className="text-text-muted">{formatBaisa(slot.price_baisa, booking.currency)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('admin.bookingDetail.confirmPaymentTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('admin.bookingDetail.cancel')}
            </Button>
            <Button onClick={handleConfirmMarkPaid} isLoading={markPaidMutation.isPending}>
              {t('admin.bookingDetail.confirmButton')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          {t('admin.bookingDetail.confirmBody', {
            amount: formatBaisa(booking.total_price_baisa, booking.currency),
            reference: booking.booking_reference,
          })}
        </p>
      </Modal>
    </Container>
  )
}
