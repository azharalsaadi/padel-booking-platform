import { useEffect } from 'react'
import type { MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { useLandingOffers } from '@/hooks/useLandingOffers'
import landingHero from '@/assets/landing-hero.png'
import ctaBackground from '@/assets/cta-background.png'

/** Every button on this page uses a 12px radius (rounded-xl) rather than the
 *  shared Button component's --radius-control token, to match the approved
 *  reference exactly — this page never uses the shared Button, so nothing
 *  else is affected. */
const BUTTON_RADIUS = 'rounded-xl'

function scrollToSection(id: string) {
  return (event: MouseEvent) => {
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/** Rounds a real integer-baisa amount to whole OMR for the marketing offer cards (10.000 -> "OMR 10"). */
function formatWholeOmr(baisa: number): string {
  return `OMR ${Math.round(baisa / 1000)}`
}

/**
 * The customer-facing marketing landing page at "/", using the same shared
 * CustomerHeader/CustomerFooter as every other customer page (see
 * CustomerShell) — there is no landing-specific chrome. Every price shown
 * below comes from a real call to the existing quote endpoint (see
 * useLandingOffers); nothing here is a hardcoded number.
 */
export function LandingPage() {
  const { t } = useTranslation()
  const offerQueries = useLandingOffers()
  const location = useLocation()

  const JOURNEY_STEPS = [
    { step: 1, title: t('landing.journeyStep1Title'), description: t('landing.journeyStep1Description') },
    { step: 2, title: t('landing.journeyStep2Title'), description: t('landing.journeyStep2Description') },
    { step: 3, title: t('landing.journeyStep3Title'), description: t('landing.journeyStep3Description') },
  ]

  const OFFER_COPY: Record<number, { label: string; description: string; featured?: boolean }> = {
    1: { label: t('landing.offer1Label'), description: t('landing.offer1Description') },
    2: { label: t('landing.offer2Label'), description: t('landing.offer2Description'), featured: true },
    3: { label: t('landing.offer3Label'), description: t('landing.offer3Description') },
  }

  // Arriving here from another page's "Offers"/"How to Book" nav link (a
  // real navigation to "/#offers") lands with a hash but no scroll — the
  // browser only auto-scrolls to an element present at initial paint, and
  // these sections exist from the first render, so a manual scroll on
  // mount/hash-change covers it.
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  return (
    <>
      {/* Hero */}
      <section className="bg-background pt-6 lg:pt-2 lg:pb-9">
        {/* The shared Container (widened site-wide for the customer theme
            via --container-6xl in index.css) — using it here, exactly like
            every other section, is what keeps the hero's left/right edges
            aligned with the navbar, cards, CTA, and footer. */}
        <Container>
          <div className="relative">
            <img src={landingHero} alt="Rally premium padel equipment" className="h-auto w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/5 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-lg px-6 py-8 sm:px-12 sm:py-10 lg:px-16">
                <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">{t('landing.heroEyebrow')}</p>
                <div aria-hidden="true" className="mt-3 mb-5 h-0.5 w-10 bg-white/40" />
                <h1 className="font-serif text-3xl leading-tight font-semibold text-white sm:text-4xl lg:text-5xl">
                  {t('landing.heroTitleLine1')} <br />
                  {t('landing.heroTitleLine2')}
                </h1>
                <p className="mt-4 max-w-md text-sm text-white/85 sm:text-base">{t('landing.heroSubtitle')}</p>
                <Link
                  to="/book"
                  className={cn(
                    BUTTON_RADIUS,
                    'mt-6 inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-primary-hover',
                  )}
                >
                  {t('common.bookNow')}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Offers */}
      <section id="offers" className="scroll-mt-20 bg-background py-20 sm:py-28 lg:py-9">
        <Container className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-text">{t('landing.offersTitle')}</h2>
              <p className="mt-2 text-sm text-text-muted">{t('landing.offersSubtitle')}</p>
            </div>
            <a
              href="#offers"
              onClick={scrollToSection('offers')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 transition-colors hover:text-primary"
            >
              {t('landing.viewAllOffers')}
              <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
            </a>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 lg:gap-8">
            {offerQueries.map((query, index) => {
              const hours = index + 1
              const copy = OFFER_COPY[hours]
              const quote = query.data
              const discountPercent =
                hours === 2 && quote && quote.discount_baisa > 0
                  ? Math.round((quote.discount_baisa / quote.standard_subtotal_baisa) * 100)
                  : null

              return (
                <div
                  key={hours}
                  className={cn(
                    'relative flex flex-col items-center gap-3 rounded-2xl border bg-surface p-8 text-center transition-transform duration-200 hover:scale-[1.02]',
                    copy.featured ? 'border-primary-300 shadow-soft' : 'border-border',
                  )}
                >
                  {copy.featured && (
                    <span className="absolute -top-3 rounded-full bg-secondary-100 px-3 py-1 text-xs font-semibold tracking-wide text-primary-700 uppercase">
                      {t('landing.mostPopular')}
                    </span>
                  )}
                  <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">{copy.label}</p>

                  {query.isLoading && (
                    <div className="flex w-full flex-col items-center gap-2 py-2">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                  )}

                  {query.isError && <p className="text-sm text-danger">{t('landing.couldNotLoadRate')}</p>}

                  {quote && (
                    <>
                      <p className="font-serif text-3xl font-bold text-text">{formatWholeOmr(quote.applied_rule.price_per_hour_baisa)}</p>
                      <p className="text-xs text-text-muted">{t('landing.perHour')}</p>
                      {discountPercent !== null && (
                        <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success">
                          {t('landing.save', { percent: discountPercent })}
                        </span>
                      )}
                    </>
                  )}

                  <p className="text-sm text-text-muted">{copy.description}</p>

                  <Link
                    to="/book"
                    className={cn(
                      BUTTON_RADIUS,
                      'mt-2 inline-flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium transition-colors',
                      copy.featured ? 'bg-primary text-white hover:bg-primary-hover' : 'border border-border text-text hover:border-primary-300',
                    )}
                  >
                    {t('landing.bookThisOffer')}
                  </Link>
                </div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* Journey */}
      <section id="how-to-book" className="scroll-mt-20 bg-background py-20 sm:py-28 lg:py-9">
        <Container className="flex flex-col gap-10">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-text">{t('landing.journeyTitle')}</h2>
            <p className="mt-2 max-w-md text-sm text-text-muted">{t('landing.journeySubtitle')}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {JOURNEY_STEPS.map((item) => (
              <div key={item.step} className="flex flex-col gap-3">
                <span
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-xl font-serif text-lg font-semibold',
                    item.step === 1 ? 'bg-primary text-white' : 'border border-border bg-surface text-text',
                  )}
                >
                  {item.step}
                </span>
                <h3 className="text-lg font-semibold text-text">{item.title}</h3>
                <p className="text-sm text-text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-background py-4 lg:py-9">
        <Container>
          <div className="relative isolate overflow-hidden rounded-card">
            <img src={ctaBackground} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-primary-700/75" />
            <div className="relative flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
              <h2 className="font-serif text-3xl font-semibold text-white sm:text-4xl">{t('landing.ctaTitle')}</h2>
              <p className="max-w-md text-white/85">{t('landing.ctaSubtitle')}</p>
              <Link
                to="/book"
                className={cn(
                  BUTTON_RADIUS,
                  'mt-2 inline-flex items-center gap-2 bg-white px-5 py-3 text-sm font-medium text-primary-700 transition-all duration-200 hover:scale-[1.02] hover:bg-white/90',
                )}
              >
                {t('common.bookNow')}
                <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
