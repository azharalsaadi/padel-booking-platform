import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

/**
 * Sanctum's CSRF-cookie route (/sanctum/csrf-cookie) is not under /api —
 * it's mounted at the app root. Derived from API_BASE_URL rather than a
 * second env var, so there's exactly one base URL to configure.
 */
const SANCTUM_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '')

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
  // Required for Sanctum's cookie-session admin auth: sends and accepts
  // the session/XSRF cookies. Inert for the guest customer endpoints,
  // which carry no session — but bootstrap/app.php's statefulApi() wraps
  // the *entire* api group, not just /admin/*, so even guest POSTs are
  // subject to CSRF verification once a stateful session cookie exists.
  withCredentials: true,
  // axios only auto-attaches X-XSRF-TOKEN for genuinely cross-origin
  // requests (the frontend's :5173 and this API's :8000 are different
  // origins) when this is explicitly enabled (axios >=1.6).
  withXSRFToken: true,
})

let csrfCookiePromise: Promise<void> | null = null

/** Memoized so repeated mutations in one page load don't re-fetch the cookie every time. */
function ensureCsrfCookie(): Promise<void> {
  csrfCookiePromise ??= axios
    .get(`${SANCTUM_ROOT_URL}/sanctum/csrf-cookie`, { withCredentials: true })
    .then(() => undefined)
    .catch((error) => {
      csrfCookiePromise = null
      throw error
    })

  return csrfCookiePromise
}

const SAFE_METHODS = new Set(['get', 'head', 'options'])

apiClient.interceptors.request.use(async (config) => {
  if (config.method && !SAFE_METHODS.has(config.method.toLowerCase())) {
    await ensureCsrfCookie()
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 419 = CSRF token mismatch/expired (stale cookie, or the session
    // ended). Drop the memoized cookie so the next mutation re-primes it
    // instead of failing the same way indefinitely.
    if (axios.isAxiosError(error) && error.response?.status === 419) {
      csrfCookiePromise = null
    }
    return Promise.reject(error)
  },
)
