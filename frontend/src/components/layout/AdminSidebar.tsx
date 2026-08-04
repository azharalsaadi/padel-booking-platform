import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/courts', label: 'Courts' },
  { to: '/admin/closures', label: 'Closures' },
  { to: '/admin/pricing', label: 'Pricing' },
]

interface AdminSidebarProps {
  className?: string
  /** Called after a link is clicked — used to close the mobile off-canvas panel. */
  onNavigate?: () => void
}

/** Static nav shell — the pages these links point to are built in Step 15. */
export function AdminSidebar({ className = '', onNavigate }: AdminSidebarProps) {
  return (
    <nav aria-label="Admin" className={cn('flex flex-col gap-1 p-4', className)}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'rounded-control px-3 py-2 text-sm font-medium',
              isActive ? 'bg-primary-50 text-primary-700' : 'text-text-muted hover:bg-primary-50 hover:text-text',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
