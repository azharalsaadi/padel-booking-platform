import axios from 'axios'
import type { ApiErrorResponse, UnavailableSlot } from '@/types/api'

export interface ParsedApiError {
  /** null when the request never reached the server (offline, DNS, CORS, timeout). */
  status: number | null
  message: string
  errorCode?: string
  fieldErrors?: Record<string, string[]>
  unavailableSlots?: UnavailableSlot[]
}

const NETWORK_ERROR_MESSAGE = 'We could not reach the server. Check your connection and try again.'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'
// 419 = Laravel's CSRF-token-mismatch status. apiClient already re-primes
// the CSRF cookie automatically for the *next* mutation (see api/client.ts),
// but the request that just failed still needs a message — "CSRF token
// mismatch" is accurate but meaningless to a customer or admin.
const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please try again.'

/** Normalizes any thrown value from an API call into one consistent shape every page can render. */
export function parseApiError(error: unknown): ParsedApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error.response === undefined) {
      return { status: null, message: NETWORK_ERROR_MESSAGE }
    }

    const body = error.response.data
    const status = error.response.status

    return {
      status,
      message: status === 419 ? SESSION_EXPIRED_MESSAGE : (body?.message ?? GENERIC_ERROR_MESSAGE),
      errorCode: body?.error_code,
      fieldErrors: body?.errors,
      unavailableSlots: body?.meta?.unavailable_slots,
    }
  }

  return { status: null, message: GENERIC_ERROR_MESSAGE }
}

export function isRateLimited(error: ParsedApiError): boolean {
  return error.status === 429
}
