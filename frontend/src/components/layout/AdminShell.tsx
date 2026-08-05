import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { useAdminLogout, useAdminMe } from '@/hooks/admin/useAdminAuth'

interface AdminShellProps {
  children: ReactNode
}

/** The admin panel's navigation lives in the horizontal AdminHeader — there is no sidebar. */
export function AdminShell({ children }: AdminShellProps) {
  const navigate = useNavigate()

  const meQuery = useAdminMe()
  const logoutMutation = useAdminLogout()

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      // Straight to the customer landing page, not back to the login
      // screen — logging out is how an admin leaves the admin area
      // entirely. replace: true so the back button can't return to a
      // stale admin page; useAdminLogout's queryClient.clear() means
      // CustomerHeader's own session check re-fetches fresh here and
      // correctly shows "Admin Login".
      onSuccess: () => navigate('/', { replace: true }),
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader adminName={meQuery.data?.name} onLogout={handleLogout} isLoggingOut={logoutMutation.isPending} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
