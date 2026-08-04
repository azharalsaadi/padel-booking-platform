import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { cn } from '@/lib/cn'
import { useAdminLogout, useAdminMe } from '@/hooks/admin/useAdminAuth'

interface AdminShellProps {
  children: ReactNode
}

/**
 * Sidebar is always visible from md breakpoint up; below that it's an
 * off-canvas panel toggled from the header's hamburger button.
 */
export function AdminShell({ children }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const sidebarId = useId()
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
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside
        id={sidebarId}
        className={cn(
          'w-64 shrink-0 border-border bg-surface md:block md:border-r',
          isSidebarOpen ? 'block border-b' : 'hidden',
        )}
      >
        <AdminSidebar onNavigate={() => setIsSidebarOpen(false)} />
      </aside>

      <div className="flex flex-1 flex-col">
        <AdminHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
          sidebarId={sidebarId}
          adminName={meQuery.data?.name}
          onLogout={handleLogout}
          isLoggingOut={logoutMutation.isPending}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
