import { useId, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { MobileMenuButton } from '@/components/layout/MobileMenuButton'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { setAdminLanguage } from '@/i18n/config'
import type { SupportedLanguage } from '@/i18n/config'

interface AdminHeaderProps {
  /** Both optional: the header renders fine before the session is known. */
  adminName?: string
  onLogout?: () => void
  isLoggingOut?: boolean
}

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-control px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-primary-50 text-primary-700' : 'text-text-muted hover:bg-primary-50 hover:text-text',
  )

const mobileNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-control px-3 py-2 text-sm font-medium', isActive ? 'bg-primary-50 text-primary-700' : 'text-text-muted hover:bg-primary-50')

/**
 * The single horizontal navbar for the whole admin panel (Step: moved off
 * the old left sidebar) — every protected admin route renders under this,
 * via AdminShell. Below lg it collapses into an off-canvas panel opened by
 * the hamburger button, same interaction pattern as CustomerHeader — a
 * wider breakpoint than CustomerHeader's md, because 5 nav links + the
 * language toggle + admin name + Log out button don't fit in one row
 * until 1024px (they visibly overlapped at 768px).
 */
export function AdminHeader({ adminName, onLogout, isLoggingOut = false }: AdminHeaderProps) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const currentLanguage = i18n.language as SupportedLanguage

  const NAV_ITEMS = [
    { to: '/admin/dashboard', label: t('admin.nav.dashboard') },
    { to: '/admin/bookings', label: t('admin.nav.bookings') },
    { to: '/admin/courts', label: t('admin.nav.courts') },
    { to: '/admin/closures', label: t('admin.nav.closures') },
    { to: '/admin/pricing', label: t('admin.nav.pricing') },
  ]

  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link to="/admin/dashboard" className="shrink-0 font-serif text-xl font-bold tracking-wide text-primary-700">
            {t('admin.nav.brand')}
          </Link>

          <nav aria-label="Admin" className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClasses}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <div
            role="group"
            aria-label={t('admin.nav.languageToggleLabel')}
            className="flex items-center gap-1.5 text-sm font-medium text-text-muted"
          >
            <Globe aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            <button
              type="button"
              onClick={() => setAdminLanguage('en')}
              aria-pressed={currentLanguage === 'en'}
              className={cn('transition-colors', currentLanguage === 'en' ? 'text-text' : 'hover:text-text')}
            >
              EN
            </button>
            /
            <button
              type="button"
              onClick={() => setAdminLanguage('ar')}
              aria-pressed={currentLanguage === 'ar'}
              className={cn('transition-colors', currentLanguage === 'ar' ? 'text-text' : 'hover:text-text')}
            >
              AR
            </button>
          </div>

          {adminName && <span className="text-sm text-text-muted">{adminName}</span>}
          {onLogout && (
            <Button variant="secondary" size="sm" onClick={onLogout} isLoading={isLoggingOut}>
              {t('admin.login.logOut')}
            </Button>
          )}
        </div>

        <MobileMenuButton
          isOpen={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          controls={menuId}
          ariaLabel={isOpen ? t('admin.nav.closeMainMenu') : t('admin.nav.openMainMenu')}
          hiddenFrom="lg"
        />
      </Container>

      {isOpen && (
        <nav id={menuId} aria-label="Admin" className="border-t border-border lg:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setIsOpen(false)} className={mobileNavLinkClasses}>
                {item.label}
              </NavLink>
            ))}

            <div role="group" aria-label={t('admin.nav.languageToggleLabel')} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted">
              <Globe aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              <button type="button" onClick={() => setAdminLanguage('en')} aria-pressed={currentLanguage === 'en'} className={currentLanguage === 'en' ? 'text-text' : ''}>
                EN
              </button>
              /
              <button type="button" onClick={() => setAdminLanguage('ar')} aria-pressed={currentLanguage === 'ar'} className={currentLanguage === 'ar' ? 'text-text' : ''}>
                AR
              </button>
            </div>

            {adminName && <span className="px-3 py-1 text-sm text-text-muted">{adminName}</span>}
            {onLogout && (
              <div className="px-3 py-1">
                <Button variant="secondary" size="sm" onClick={onLogout} isLoading={isLoggingOut} className="w-full">
                  {t('admin.login.logOut')}
                </Button>
              </div>
            )}
          </Container>
        </nav>
      )}
    </header>
  )
}
