import { useId, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { MobileMenuButton } from '@/components/layout/MobileMenuButton'
import { cn } from '@/lib/cn'
import { setLanguage } from '@/i18n/config'
import type { SupportedLanguage } from '@/i18n/config'

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
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const location = useLocation()
  const onLandingPage = location.pathname === '/'
  const currentLanguage = i18n.language as SupportedLanguage

  const ROUTE_NAV_LINKS = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/book', label: t('nav.bookACourt'), end: false },
  ]

  const SCROLL_NAV_LINKS = [
    { targetId: 'offers', label: t('nav.offers') },
    { targetId: 'how-to-book', label: t('nav.howToBook') },
  ]

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
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0 font-serif text-2xl font-bold tracking-wide text-primary" aria-label={t('nav.rallyHome')}>
          RALLY
        </Link>

        <nav aria-label="Primary" className="hidden md:flex md:items-center md:gap-8">
          {ROUTE_NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClasses}>
              {item.label}
            </NavLink>
          ))}
          {SCROLL_NAV_LINKS.map((item) => renderScrollLink(item, 'text-sm font-medium text-text-muted hover:text-text'))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <div
            role="group"
            aria-label={t('nav.languageToggleLabel')}
            className="flex items-center gap-1.5 text-sm font-medium text-text-muted"
          >
            <Globe aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-pressed={currentLanguage === 'en'}
              className={cn('transition-colors', currentLanguage === 'en' ? 'text-text' : 'hover:text-text')}
            >
              EN
            </button>
            /
            <button
              type="button"
              onClick={() => setLanguage('ar')}
              aria-pressed={currentLanguage === 'ar'}
              className={cn('transition-colors', currentLanguage === 'ar' ? 'text-text' : 'hover:text-text')}
            >
              AR
            </button>
          </div>
          <Link to="/book" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover">
            {t('nav.bookNow')}
          </Link>
        </div>

        <MobileMenuButton
          isOpen={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          controls={menuId}
          ariaLabel={isOpen ? t('nav.closeMainMenu') : t('nav.openMainMenu')}
        />
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
            <div role="group" aria-label={t('nav.languageToggleLabel')} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted">
              <Globe aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              <button type="button" onClick={() => setLanguage('en')} aria-pressed={currentLanguage === 'en'} className={currentLanguage === 'en' ? 'text-text' : ''}>
                EN
              </button>
              /
              <button type="button" onClick={() => setLanguage('ar')} aria-pressed={currentLanguage === 'ar'} className={currentLanguage === 'ar' ? 'text-text' : ''}>
                AR
              </button>
            </div>
            <Link to="/book" onClick={() => setIsOpen(false)} className="mt-2 rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-medium text-white">
              {t('nav.bookNow')}
            </Link>
          </Container>
        </nav>
      )}
    </header>
  )
}
