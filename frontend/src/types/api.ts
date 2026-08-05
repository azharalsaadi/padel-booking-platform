// Mirrors the actual backend contract established in Steps 7-12
// (backend/app/Http/Resources/Customer/*, backend/routes/api.php).
// Superseded the Step 2 scaffold's guessed shapes (e.g. a calendar-month
// endpoint and lookup-by-reference+phone) that the real backend never
// implements — guest lookup is by access_token only, and there is no
// calendar endpoint, only single-date availability.

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'expired'

export type PaymentMethod = 'pay_at_venue' | 'thawani'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded' | 'cancelled'

/** GET /availability already filters to available:true only, but the field ships regardless. */
export interface AvailabilitySlot {
  date: string
  start_time: string
  end_time: string
  available: boolean
}

/** The shape every slot-selecting request (quote, booking) sends — H:i time strings. */
export interface SelectedSlot {
  date: string
  start_time: string
  end_time: string
}

export interface QuoteDayBreakdown {
  date: string
  hours: number
}

export interface AppliedPricingRule {
  hours_from: number
  hours_to: number | null
  price_per_hour_baisa: number
}

export interface UnavailableSlot {
  date: string
  start_time: string
}

export interface QuoteResponse {
  currency: string
  total_hours: number
  days: QuoteDayBreakdown[]
  standard_subtotal_baisa: number
  applied_rule: AppliedPricingRule
  discount_baisa: number
  total_price_baisa: number
  all_slots_available: boolean
  unavailable_slots: UnavailableSlot[]
}

export interface CreateBookingPayload {
  customer_phone: string
  customer_name?: string | null
  customer_email?: string | null
  notes?: string | null
  payment_method: PaymentMethod
  slots: SelectedSlot[]
}

export interface BookingSlotView {
  date: string
  start_time: string
  end_time: string
  price_baisa: number
  /** Only present once the booking is booking_status=confirmed and payment_status=paid. */
  court_name?: string | null
}

/**
 * access_token is only ever populated in the response to POST /bookings —
 * every other endpoint that returns a BookingView (lookup/cancel/retry/
 * refresh) omits it, matching the backend's BookingResource contract.
 */
export interface BookingView {
  booking_reference: string
  access_token?: string
  booking_status: BookingStatus
  payment_method: PaymentMethod
  payment_status?: PaymentStatus
  currency: string
  total_hours: number
  total_price_baisa: number
  checkout_url?: string
  hold_expires_at?: string | null
  customer_phone: string
  customer_name: string | null
  customer_email: string | null
  notes: string | null
  slots: BookingSlotView[]
}

export interface ApiErrorResponse {
  message: string
  errors?: Record<string, string[]>
  error_code?: string
  meta?: { unavailable_slots?: UnavailableSlot[] }
}
