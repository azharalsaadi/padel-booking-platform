import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminLogin, adminLogout, fetchAdminMe } from '@/api/admin'

export const ADMIN_ME_QUERY_KEY = ['admin', 'me']

/**
 * The single source of truth for "is an admin currently logged in" —
 * AdminGuard, the login page, and the header all read this same query
 * rather than keeping separate auth state that could drift out of sync.
 */
export function useAdminMe() {
  return useQuery({
    queryKey: ADMIN_ME_QUERY_KEY,
    queryFn: fetchAdminMe,
    retry: false,
  })
}

export function useAdminLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => adminLogin(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(ADMIN_ME_QUERY_KEY, user)
    },
  })
}

export function useAdminLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminLogout,
    // Wipes every cached query, not just admin/me — no stale admin data
    // (bookings, courts, ...) should survive into whatever's rendered
    // next. The next mount of useAdminMe() (e.g. CustomerHeader on the
    // page logout redirects to) has nothing cached and fetches fresh,
    // which is what correctly turns up "no session" post-logout.
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
