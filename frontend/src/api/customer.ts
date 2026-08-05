import { apiClient } from '@/api/client'
import type { AvailabilitySlot, BookingView, CreateBookingPayload, QuoteResponse, SelectedSlot } from '@/types/api'

interface Envelope<T> {
  data: T
}

/**
 * Display info for the local Thawani checkout simulator (THAWANI_MODE=mock
 * — see backend/app/Services/MockThawaniService.php). This academic
 * project has no real Thawani merchant credentials, so a Thawani booking's
 * checkout_url points here instead of the real UAT hosted checkout page.
 */
export interface MockThawaniSession {
  booking_reference: string
  total_price_baisa: number
  currency: string
  payment_status: string
}

export async function fetchMockThawaniSession(sessionId: string): Promise<MockThawaniSession> {
  const response = await apiClient.get<Envelope<MockThawaniSession>>(`/mock-thawani/${encodeURIComponent(sessionId)}`)
  return response.data.data
}

export async function completeMockThawaniPayment(sessionId: string): Promise<BookingView> {
  const response = await apiClient.post<Envelope<BookingView>>(`/mock-thawani/${encodeURIComponent(sessionId)}/succeed`)
  return response.data.data
}

export async function failMockThawaniPayment(sessionId: string): Promise<BookingView> {
  const response = await apiClient.post<Envelope<BookingView>>(`/mock-thawani/${encodeURIComponent(sessionId)}/fail`)
  return response.data.data
}

export async function fetchAvailability(date: string): Promise<AvailabilitySlot[]> {
  const response = await apiClient.get<Envelope<AvailabilitySlot[]>>('/availability', { params: { date } })
  return response.data.data
}

export async function fetchQuote(slots: SelectedSlot[]): Promise<QuoteResponse> {
  const response = await apiClient.post<Envelope<QuoteResponse>>('/bookings/quote', { slots })
  return response.data.data
}

export async function createBooking(payload: CreateBookingPayload): Promise<BookingView> {
  const response = await apiClient.post<Envelope<BookingView>>('/bookings', payload)
  return response.data.data
}

export async function fetchBookingByToken(accessToken: string): Promise<BookingView> {
  const response = await apiClient.get<Envelope<BookingView>>(`/bookings/${encodeURIComponent(accessToken)}`)
  return response.data.data
}

export async function cancelBooking(accessToken: string): Promise<BookingView> {
  const response = await apiClient.post<Envelope<BookingView>>(
    `/bookings/${encodeURIComponent(accessToken)}/cancel`,
  )
  return response.data.data
}

export async function retryThawaniPayment(accessToken: string): Promise<BookingView> {
  const response = await apiClient.post<Envelope<BookingView>>(
    `/bookings/${encodeURIComponent(accessToken)}/retry-payment`,
  )
  return response.data.data
}

export async function refreshPaymentStatus(accessToken: string): Promise<BookingView> {
  const response = await apiClient.post<Envelope<BookingView>>(
    `/bookings/${encodeURIComponent(accessToken)}/refresh-payment`,
  )
  return response.data.data
}

export interface BookingPdfDownload {
  blob: Blob
  filename: string
}

const DEFAULT_PDF_FILENAME = 'booking.pdf'

/** Filename comes from the server's own Content-Disposition header, matching whatever BookingPdfService actually generated. */
function filenameFromContentDisposition(header: string | undefined): string {
  const match = header?.match(/filename="?([^";]+)"?/)
  return match?.[1] ?? DEFAULT_PDF_FILENAME
}

export async function downloadBookingPdf(accessToken: string): Promise<BookingPdfDownload> {
  const response = await apiClient.get(`/bookings/${encodeURIComponent(accessToken)}/pdf`, {
    responseType: 'blob',
  })
  return {
    blob: response.data as Blob,
    filename: filenameFromContentDisposition(response.headers['content-disposition']),
  }
}
