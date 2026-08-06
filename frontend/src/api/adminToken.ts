/**
 * The admin Sanctum bearer token, persisted only for the current tab
 * (sessionStorage, not localStorage) so a closed browser doesn't leave a
 * long-lived credential lying around. Frontend and backend are deployed on
 * different domains, so there is no session cookie to rely on — this token
 * is the entire admin auth state.
 */
const ADMIN_TOKEN_STORAGE_KEY = 'padel_admin_auth_token'

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token)
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
}
