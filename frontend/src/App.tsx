import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes/router'
import { ToastProvider } from '@/components/ui/Toast'
import { parseApiError } from '@/api/errors'
import { ADMIN_ME_QUERY_KEY } from '@/hooks/admin/useAdminAuth'

/**
 * Retrying a 4xx just repeats the same failure (bad input, conflict, auth
 * failure, missing resource) — only a network error or a 5xx is worth one
 * automatic retry.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = parseApiError(error).status
  if (status !== null && status < 500) return false
  return failureCount < 1
}

/**
 * A 401 means the admin session ended (expired, logged out elsewhere,
 * etc.) while the user was still on a protected page — no customer/guest
 * endpoint requires auth at all, so a 401 can only ever come from one.
 * Flipping the shared "me" query to null here makes AdminGuard — which
 * reads that same query — redirect to /admin/login immediately, without
 * waiting for the next navigation.
 */
function handlePossibleSessionExpiry(error: unknown) {
  if (parseApiError(error).status === 401) {
    queryClient.setQueryData(ADMIN_ME_QUERY_KEY, null)
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: handlePossibleSessionExpiry,
  }),
  mutationCache: new MutationCache({
    onError: handlePossibleSessionExpiry,
  }),
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
