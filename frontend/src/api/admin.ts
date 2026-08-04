import { apiClient } from '@/api/client'
import type {
  AdminBooking,
  AdminBookingFilters,
  AdminUser,
  Court,
  CourtClosure,
  CourtPayload,
  CourtWorkingHourEntry,
  CreateClosurePayload,
  PaginatedResponse,
  PricingRule,
  PricingRulePayload,
} from '@/types/admin'

interface Envelope<T> {
  data: T
}

// --- Auth ---------------------------------------------------------------

export async function adminLogin(email: string, password: string): Promise<AdminUser> {
  const response = await apiClient.post<Envelope<AdminUser>>('/admin/login', { email, password })
  return response.data.data
}

export async function adminLogout(): Promise<void> {
  await apiClient.post('/admin/logout')
}

export async function fetchAdminMe(): Promise<AdminUser> {
  const response = await apiClient.get<Envelope<AdminUser>>('/admin/me')
  return response.data.data
}

// --- Courts ---------------------------------------------------------------

export async function fetchCourts(): Promise<PaginatedResponse<Court>> {
  const response = await apiClient.get<PaginatedResponse<Court>>('/admin/courts')
  return response.data
}

export async function fetchCourt(id: number): Promise<Court> {
  const response = await apiClient.get<Envelope<Court>>(`/admin/courts/${id}`)
  return response.data.data
}

export async function createCourt(payload: CourtPayload): Promise<Court> {
  const response = await apiClient.post<Envelope<Court>>('/admin/courts', payload)
  return response.data.data
}

export async function updateCourt(id: number, payload: CourtPayload): Promise<Court> {
  const response = await apiClient.put<Envelope<Court>>(`/admin/courts/${id}`, payload)
  return response.data.data
}

export async function deleteCourt(id: number): Promise<void> {
  await apiClient.delete(`/admin/courts/${id}`)
}

export async function updateCourtWorkingHours(id: number, workingHours: CourtWorkingHourEntry[]): Promise<Court> {
  const response = await apiClient.put<Envelope<Court>>(`/admin/courts/${id}/working-hours`, {
    working_hours: workingHours,
  })
  return response.data.data
}

// --- Closures ---------------------------------------------------------------

export async function fetchClosures(): Promise<PaginatedResponse<CourtClosure>> {
  const response = await apiClient.get<PaginatedResponse<CourtClosure>>('/admin/closures')
  return response.data
}

export async function createClosure(payload: CreateClosurePayload): Promise<CourtClosure[]> {
  const response = await apiClient.post<Envelope<CourtClosure[]>>('/admin/closures', payload)
  return response.data.data
}

export async function deleteClosure(id: number): Promise<void> {
  await apiClient.delete(`/admin/closures/${id}`)
}

export async function deleteClosureBatch(batchId: string): Promise<{ message: string; deleted_count: number }> {
  const response = await apiClient.delete<{ message: string; deleted_count: number }>(
    `/admin/closures/batch/${encodeURIComponent(batchId)}`,
  )
  return response.data
}

// --- Pricing rules ---------------------------------------------------------------

export async function fetchPricingRules(): Promise<PricingRule[]> {
  const response = await apiClient.get<Envelope<PricingRule[]>>('/admin/pricing-rules')
  return response.data.data
}

export async function createPricingRule(payload: PricingRulePayload): Promise<PricingRule> {
  const response = await apiClient.post<Envelope<PricingRule>>('/admin/pricing-rules', payload)
  return response.data.data
}

export async function updatePricingRule(id: number, payload: PricingRulePayload): Promise<PricingRule> {
  const response = await apiClient.put<Envelope<PricingRule>>(`/admin/pricing-rules/${id}`, payload)
  return response.data.data
}

export async function deletePricingRule(id: number): Promise<void> {
  await apiClient.delete(`/admin/pricing-rules/${id}`)
}

// --- Bookings ---------------------------------------------------------------

export async function fetchAdminBookings(filters: AdminBookingFilters = {}): Promise<PaginatedResponse<AdminBooking>> {
  const response = await apiClient.get<PaginatedResponse<AdminBooking>>('/admin/bookings', { params: filters })
  return response.data
}

export async function fetchAdminBooking(id: number): Promise<AdminBooking> {
  const response = await apiClient.get<Envelope<AdminBooking>>(`/admin/bookings/${id}`)
  return response.data.data
}

export async function markBookingPaid(id: number): Promise<AdminBooking> {
  const response = await apiClient.post<Envelope<AdminBooking>>(`/admin/bookings/${id}/mark-paid`)
  return response.data.data
}
