import axios from 'axios'
import { clearAdminToken, getAdminToken } from '@/api/adminToken'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
})

// Admin auth is stateless Sanctum bearer tokens (backend and frontend are
// deployed on different domains, so cookie/session auth doesn't work) —
// every request carries whatever token is currently stored, if any. Guest
// customer endpoints never look at this header and ignore it.
apiClient.interceptors.request.use((config) => {
  const token = getAdminToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired/revoked/missing token — drop it locally so AdminGuard's
    // next session check fails cleanly and redirects to login instead of
    // repeatedly sending a token the backend has already rejected.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAdminToken()
    }
    return Promise.reject(error)
  },
)
