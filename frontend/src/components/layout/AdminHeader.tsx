import { MobileMenuButton } from '@/components/layout/MobileMenuButton'
import { Button } from '@/components/ui/Button'

interface AdminHeaderProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  sidebarId: string
  /** Both optional: the header renders fine before the session is known. */
  adminName?: string
  onLogout?: () => void
  isLoggingOut?: boolean
}

export function AdminHeader({
  isSidebarOpen,
  onToggleSidebar,
  sidebarId,
  adminName,
  onLogout,
  isLoggingOut = false,
}: AdminHeaderProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4">
      <MobileMenuButton
        isOpen={isSidebarOpen}
        onClick={onToggleSidebar}
        controls={sidebarId}
        label="Admin navigation"
      />
      <p className="text-lg font-semibold text-primary-700">Padel Admin</p>

      {/*
        No "View Customer Site" link here by design — logging out (below)
        is how an admin leaves the admin area, landing directly on the
        customer site. A separate link back would just be a second way to
        end up there without actually ending the session.
      */}
      <div className="ml-auto flex items-center gap-3">
        {adminName && <span className="hidden text-sm text-text-muted sm:inline">{adminName}</span>}
        {onLogout && (
          <Button variant="secondary" size="sm" onClick={onLogout} isLoading={isLoggingOut}>
            Log out
          </Button>
        )}
      </div>
    </header>
  )
}
