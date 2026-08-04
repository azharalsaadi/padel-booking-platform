/** Mirrors the backend's exact rule (StoreBookingRequest): +968 followed by 8 digits. */
const OMANI_PHONE_PATTERN = /^\+968\d{8}$/

export function isValidOmaniPhone(value: string): boolean {
  return OMANI_PHONE_PATTERN.test(value.trim())
}
