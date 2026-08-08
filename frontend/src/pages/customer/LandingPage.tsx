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
import pricingRackets from '@/assets/pricing-padel-rackets.png'
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
     <section className="bg-background pt-6 lg:pt-2 lg:pb-0">
        {/* The shared Container (widened site-wide for the customer theme
            via --container-6xl in index.css) — using it here, exactly like
            every other section, is what keeps the hero's left/right edges
            aligned with the navbar, cards, CTA, and footer. */}
        <Container>
          <div className="relative -mb-10 lg:-mb-14">
            <img src={landingHero} alt="Rally premium padel equipment" className="h-auto w-full" />
            <div
  className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/5 to-transparent"
  style={{
    WebkitMaskImage: `url(${landingHero})`,
    maskImage: `url(${landingHero})`,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  }}
/>
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
      <section id="offers" className="scroll-mt-20 bg-background py-12">
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
<div className="grid gap-6 lg:grid-cols-3 lg:gap-5">
  {offerQueries.map((query, index) => {
    const hours = index + 1
    const copy = OFFER_COPY[hours]
    const quote = query.data

    const discountPercent =
      hours === 2 && quote && quote.discount_baisa > 0
        ? Math.round(
            (quote.discount_baisa /
              quote.standard_subtotal_baisa) *
              100,
          )
        : null

    return (
      <div
        key={hours}
        className={cn(
          'relative isolate min-h-[320px] overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1',
          copy.featured
            ? 'border-border bg-[#10231d] text-white shadow-xl'
            : 'border-border bg-[#faf7f1] text-text shadow-sm',
        )}
      >
        {/* صورة مضارب البادل */}
        <img
          src={pricingRackets}
          alt=""
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute right-[-55px] bottom-[-45px] z-0 w-[66%] object-contain',
            copy.featured ? 'opacity-100' : 'opacity-90',
          )}
        />

        {/* تدرّج خلف النص */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 z-[1]',
            copy.featured
              ? 'bg-gradient-to-r from-[#10231d] via-[#10231d]/95 to-transparent'
              : 'bg-gradient-to-r from-[#faf7f1] via-[#faf7f1]/95 to-transparent',
          )}
        />

        {/* Most Popular */}
        {copy.featured && (
          <span className="absolute top-0 left-1/2 z-20 -translate-x-1/2 rounded-b-xl bg-[#e7c477] px-5 py-1.5 text-[11px] font-bold tracking-wide whitespace-nowrap text-black uppercase">
            ★ {t('landing.mostPopular')}
          </span>
        )}

        {/* محتوى الكارد */}
        <div className="relative z-10 flex min-h-[264px] w-[62%] flex-col items-start">
          <p
            className={cn(
              'mt-4 text-xs font-semibold tracking-wide uppercase',
              copy.featured
                ? 'text-white/75'
                : 'text-text-muted',
            )}
          >
            {copy.label}
          </p>

          {query.isLoading && (
            <div className="mt-5 flex flex-col gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          )}

          {query.isError && (
            <p className="mt-5 text-sm text-danger">
              {t('landing.couldNotLoadRate')}
            </p>
          )}

          {quote && (
            <>
              <p
                className={cn(
                  'mt-3 font-serif text-4xl font-bold whitespace-nowrap',
                  copy.featured
                    ? 'text-white'
                    : 'text-text',
                )}
              >
                {formatWholeOmr(
                  quote.applied_rule.price_per_hour_baisa,
                )}
              </p>

              <p
                className={cn(
                  'mt-1 text-xs',
                  copy.featured
                    ? 'text-white/70'
                    : 'text-text-muted',
                )}
              >
                {t('landing.perHour')}
              </p>

              {discountPercent !== null && (
                <span className="mt-3 rounded-full bg-[#dcebe2] px-3 py-1 text-xs font-semibold text-[#225c43]">
                  {t('landing.save', {
                    percent: discountPercent,
                  })}
                </span>
              )}
            </>
          )}

          <p
            className={cn(
              'mt-4 text-left text-sm leading-relaxed',
              copy.featured
                ? 'text-white/80'
                : 'text-text-muted',
            )}
          >
            {copy.description}
          </p>

          <Link
            to="/book"
            className={cn(
              BUTTON_RADIUS,
              'mt-auto inline-flex w-full items-center justify-center px-4 py-3 text-sm font-semibold transition-all hover:scale-[1.02]',
              copy.featured
                ? 'bg-[#e7c477] text-black hover:bg-[#d9b464]'
                : 'bg-[#123027] text-white hover:bg-[#1b4438]',
            )}
          >
            {t('landing.bookThisOffer')}
          </Link>
        </div>
      </div>
    )
  })}
</div>
        </Container>
      </section>

      {/* Journey */}
      <section id="how-to-book" className="scroll-mt-20 bg-background py-12">
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
      <section className="bg-background py-12">
        <Container>
          <div className="relative isolate overflow-hidden rounded-card">
            <img src={ctaBackground} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-primary-700/45" />
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
