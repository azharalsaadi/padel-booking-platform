// Mirrors the actual Step 11 admin API contract (backend/app/Http/Resources/Admin/*,
// backend/app/Http/Requests/Admin/*, backend/routes/api.php admin group).
import type { BookingStatus, PaymentMethod, PaymentStatus } from '@/types/api'

export interface AdminUser {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface CourtWorkingHourEntry {
  day_of_week: number // 0 (Sunday) - 6 (Saturday), PHP Carbon::dayOfWeek convention
  open_time: string // H:i
  close_time: string // H:i
}

export interface Court {
  id: number
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  /** Only present when the detail endpoint (show) loaded the relation. */
  working_hours?: CourtWorkingHourEntry[]
  created_at: string
  updated_at: string
}

export interface CourtPayload {
  name: string
  description?: string | null
  is_active?: boolean
  sort_order?: number
}

export type ClosureDatesMode = 'single' | 'multiple' | 'range'

export interface CourtClosure {
  id: number
  batch_id: string | null
  court_id: number | null
  court_name: string | null
  date_start: string
  date_end: string
  is_full_day: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
}

export interface CreateClosurePayload {
  /** null/omitted means every court. */
  court_ids: number[] | null
  dates:
    | { mode: 'single' | 'multiple'; values: string[] }
    | { mode: 'range'; range: { start: string; end: string } }
  is_full_day: boolean
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
}

export interface PricingRule {
  id: number
  hours_from: number
  hours_to: number | null
  price_per_hour_baisa: number
  is_active: boolean
}

export interface PricingRulePayload {
  hours_from: number
  hours_to?: number | null
  price_per_hour_baisa: number
  is_active?: boolean
}

export interface AdminBookingSlot {
  date: string
  start_time: string
  end_time: string
  price_baisa: number
  court_id: number | null
  court_name: string | null
}

export interface AdminBooking {
  id: number
  booking_reference: string
  booking_status: BookingStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus | null
  paid_at: string | null
  currency: string
  total_price_baisa: number
  customer_phone: string
  customer_name: string | null
  customer_email: string | null
  notes: string | null
  hold_expires_at: string | null
  confirmed_at: string | null
  cancelled_at: string | null
  created_at: string | null
  slots: AdminBookingSlot[]
}

export interface AdminBookingFilters {
  court_id?: number
  date_from?: string
  date_to?: string
  status?: BookingStatus
  payment_method?: PaymentMethod
  phone?: string
  reference?: string
  per_page?: number
  page?: number
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}
