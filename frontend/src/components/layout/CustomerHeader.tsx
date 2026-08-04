import { useId, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { MobileMenuButton } from '@/components/layout/MobileMenuButton'
import { cn } from '@/lib/cn'

const ROUTE_NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/book', label: 'Book a Court', end: false },
]

const SCROLL_NAV_LINKS = [
  { targetId: 'offers', label: 'Offers' },
  { targetId: 'how-to-book', label: 'How to Book' },
]

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn('text-sm font-medium underline-offset-4', isActive ? 'text-primary-700 underline' : 'text-text-muted hover:text-text')

const mobileNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-control px-3 py-2 text-sm font-medium', isActive ? 'bg-primary-50 text-primary-700' : 'text-text-muted hover:bg-primary-50')

/**
 * The single navbar for every customer-facing page (identical everywhere
 * by design — there is no separate "landing" vs "other pages" header
 * anymore). "Offers"/"How to Book" only exist as sections on the landing
 * page: while already on "/" they smooth-scroll in place; from any other
 * page they're a normal navigation to "/#offers" etc., and LandingPage
 * itself scrolls to the matching section once it mounts.
 *
 * There is no customer login and no Admin Login link here by design — the
 * customer nav no longer exposes an admin entry point at all.
 */
export function CustomerHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const location = useLocation()
  const onLandingPage = location.pathname === '/'

  function renderScrollLink(item: (typeof SCROLL_NAV_LINKS)[number], className: string, onNavigate?: () => void) {
    if (onLandingPage) {
      return (
        <a
          key={item.targetId}
          href={`#${item.targetId}`}
          onClick={(event: MouseEvent) => {
            event.preventDefault()
            onNavigate?.()
            document.getElementById(item.targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className={className}
        >
          {item.label}
        </a>
      )
    }

    return (
      <Link key={item.targetId} to={`/#${item.targetId}`} onClick={onNavigate} className={className}>
        {item.label}
      </Link>
    )
  }

  return (
    <header className="border-b border-border bg-background">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0 font-serif text-2xl font-bold tracking-wide text-primary" aria-label="Rally home">
          RALLY
        </Link>

        <nav aria-label="Primary" className="hidden md:flex md:items-center md:gap-8">
          {ROUTE_NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClasses}>
              {item.label}
            </NavLink>
          ))}
          {SCROLL_NAV_LINKS.map((item) => renderScrollLink(item, 'text-sm font-medium text-text-muted hover:text-text'))}
          <NavLink to="/my-booking" className={navLinkClasses}>
            My Bookings
          </NavLink>
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text"
            aria-label="Language: English / Arabic"
            title="Real Arabic translation is not implemented yet"
          >
            EN/AR
            <Globe aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <Link to="/book" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover">
            Book Now
          </Link>
        </div>

        <MobileMenuButton isOpen={isOpen} onClick={() => setIsOpen((open) => !open)} controls={menuId} label="Main menu" />
      </Container>

      {isOpen && (
        <nav id={menuId} aria-label="Primary" className="border-t border-border md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {ROUTE_NAV_LINKS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setIsOpen(false)} className={mobileNavLinkClasses}>
                {item.label}
              </NavLink>
            ))}
            {SCROLL_NAV_LINKS.map((item) =>
              renderScrollLink(item, 'rounded-control px-3 py-2 text-sm font-medium text-text-muted hover:bg-primary-50', () => setIsOpen(false)),
            )}
            <NavLink to="/my-booking" onClick={() => setIsOpen(false)} className={mobileNavLinkClasses}>
              My Bookings
            </NavLink>
            <Link to="/book" onClick={() => setIsOpen(false)} className="mt-2 rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-medium text-white">
              Book Now
            </Link>
          </Container>
        </nav>
      )}
    </header>
  )
}
