import type { TFunction } from 'i18next'
import type { BadgeVariant } from '@/components/ui/Badge'
import type { BookingStatus, PaymentStatus } from '@/types/api'

/**
 * Status meaning is never conveyed by color alone — every Badge usage
 * pairs one of these variants with a translated label (see
 * getBookingStatusLabel/getPaymentStatusLabel below), so color is never the
 * only signal.
 */
export const BOOKING_STATUS_VARIANTS: Record<BookingStatus, BadgeVariant> = {
  pending_payment: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
  expired: 'neutral',
}

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  expired: 'neutral',
  refunded: 'info',
  cancelled: 'neutral',
}

/** Translated labels for the admin panel's own i18n. */
export function getBookingStatusLabel(status: BookingStatus, t: TFunction): string {
  return t(`admin.bookingStatus.${status}`)
}

export function getPaymentStatusLabel(status: PaymentStatus, t: TFunction): string {
  return t(`admin.paymentStatus.${status}`)
}
