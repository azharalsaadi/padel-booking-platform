import { Camera, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/layout/Container'

/**
 * The single footer for every customer-facing page. Privacy Policy / Terms
 * of Service / Contact Us / Instagram are shown as plain, non-interactive
 * labels matching the approved layout — none of those pages or accounts
 * exist in this project, so they're intentionally not rendered as links.
 * Instagram is represented with lucide-react's generic Camera icon since
 * the library no longer ships brand icons.
 */
export function CustomerFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-border bg-background">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className="font-serif text-xl font-bold tracking-wide text-primary">RALLY</span>
          <p className="max-w-xs text-sm text-text-muted">{t('footer.tagline')}</p>
          <div className="flex items-center gap-3 text-text-muted">
            <Camera aria-hidden="true" className="h-5 w-5" strokeWidth={1.4} />
            <MessageCircle aria-hidden="true" className="h-5 w-5" strokeWidth={1.4} />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:items-end">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
            <span>{t('footer.privacyPolicy')}</span>
            <span>{t('footer.termsOfService')}</span>
            <span>{t('footer.contactUs')}</span>
            <span>{t('footer.instagram')}</span>
          </div>
          <p className="text-sm text-text-muted">{t('footer.rights', { year: new Date().getFullYear() })}</p>
        </div>
      </Container>
    </footer>
  )
}
