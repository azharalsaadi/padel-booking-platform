import type { BadgeVariant } from '@/components/ui/Badge'
import type { BookingStatus, PaymentStatus } from '@/types/api'

/**
 * Status meaning is never conveyed by color alone — every Badge usage
 * pairs one of these labels with the variant, so the text itself always
 * carries the meaning too.
 */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export const BOOKING_STATUS_VARIANTS: Record<BookingStatus, BadgeVariant> = {
  pending_payment: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
  expired: 'neutral',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  expired: 'Expired',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  expired: 'neutral',
  refunded: 'info',
  cancelled: 'neutral',
}
