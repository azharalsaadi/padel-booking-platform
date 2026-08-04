import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Lock,
  ShieldCheck,
} from 'lucide-react'

import checkoutPadel from '@/assets/checkout-padel.png'
import { Container } from '@/components/layout/Container'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useCompleteMockThawaniPayment,
  useFailMockThawaniPayment,
  useMockThawaniSession,
} from '@/hooks/useMockThawani'
import { formatBaisa } from '@/lib/money'

export function MockThawaniCheckoutPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const sessionQuery = useMockThawaniSession(sessionId)
  const succeedMutation = useCompleteMockThawaniPayment(sessionId)
  const failMutation = useFailMockThawaniPayment(sessionId)

  const isBusy =
    succeedMutation.isPending || failMutation.isPending

  function handleSucceed() {
    succeedMutation.mutate(undefined, {
      onSuccess: (booking) => {
        navigate(
          `/booking/${booking.access_token}/processing`,
          { replace: true },
        )
      },
    })
  }

  function handleFail() {
    failMutation.mutate(undefined, {
      onSuccess: (booking) => {
        navigate(
          `/booking/${booking.access_token}/failed`,
          { replace: true },
        )
      },
    })
  }

  return (
    <Container className="flex flex-col items-center px-4 pb-16 pt-16 text-center sm:pt-20 lg:pb-20 lg:pt-24">
      {/* Page heading */}
      <h1 className="font-serif text-[46px] font-semibold leading-none tracking-[-0.04em] text-text sm:text-[56px] lg:text-[62px]">
        Secure Checkout
      </h1>

      <p className="mt-5 flex items-center justify-center gap-3 text-[12px] font-medium uppercase tracking-[0.12em] text-text-muted sm:text-[13px]">
        <Lock
          aria-hidden="true"
          className="h-[17px] w-[17px]"
          strokeWidth={1.6}
        />
        Powered by Thawani Sandbox
      </p>

      {/* Checkout card */}
      <section className="mt-8 w-full max-w-[600px]">
        <div className="overflow-hidden rounded-[14px] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.07)]">
          {/* Court image only */}
          <img
            src={checkoutPadel}
            alt="Padel court"
            className="block h-[210px] w-full object-cover sm:h-[230px]"
          />

          {/* Card content */}
          <div className="px-6 pb-8 pt-7 text-left sm:px-9 sm:pb-9 sm:pt-8">
            {sessionQuery.isLoading && (
              <div
                aria-busy="true"
                aria-label="Loading payment information"
              >
                <Skeleton className="h-5 w-full" />
                <Skeleton className="mt-6 h-12 w-full" />
                <Skeleton className="mt-4 h-12 w-full" />
              </div>
            )}

            {sessionQuery.isError && (
              <ErrorMessage
                title="Could not load payment"
                message="This checkout link is invalid or has expired."
              />
            )}

            {sessionQuery.data && (
              <>
                {/* Booking reference */}
                <div className="flex items-center justify-between gap-6">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-text-muted sm:text-[12px]">
                    Booking Reference
                  </span>

                  <span className="text-right text-[13px] font-semibold text-text sm:text-[14px]">
                    {sessionQuery.data.booking_reference}
                  </span>
                </div>

                <div className="my-7 border-t border-border" />

                {/* Total */}
                <div className="flex items-start justify-between gap-6">
                  <h2 className="font-serif text-[27px] font-semibold leading-none tracking-[-0.025em] text-text sm:text-[31px]">
                    Total Amount
                  </h2>

                  <div className="text-right">
                    <p className="font-serif text-[27px] font-semibold leading-none tracking-[-0.025em] text-text sm:text-[31px]">
                      {formatBaisa(
                        sessionQuery.data.total_price_baisa,
                        sessionQuery.data.currency,
                      )}
                    </p>

                    <p className="mt-2 text-[8px] font-medium uppercase tracking-[0.05em] text-text-muted sm:text-[9px]">
                      Incl. all taxes
                    </p>
                  </div>
                </div>

                {/* Primary action */}
                <button
                  type="button"
                  onClick={handleSucceed}
                  disabled={isBusy}
                  className="mt-8 flex h-[55px] w-full items-center justify-center gap-3 rounded-[5px] bg-primary px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lock
                    aria-hidden="true"
                    className="h-[19px] w-[19px]"
                    strokeWidth={1.8}
                  />

                  {succeedMutation.isPending
                    ? 'Processing...'
                    : 'Complete Payment'}
                </button>

                {/* Secondary action */}
                <button
                  type="button"
                  onClick={handleFail}
                  disabled={isBusy}
                  className="mt-4 h-[55px] w-full rounded-[5px] border border-border bg-white px-5 text-[15px] font-medium text-text transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {failMutation.isPending
                    ? 'Cancelling...'
                    : 'Cancel Payment'}
                </button>

                {(succeedMutation.isError ||
                  failMutation.isError) && (
                  <div className="mt-4">
                    <ErrorMessage message="The payment action could not be completed. Please try again." />
                  </div>
                )}

                {/* Security information */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[9px] font-medium uppercase tracking-[0.02em] text-text-muted sm:flex-nowrap sm:gap-6 sm:text-[10px]">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <ShieldCheck
                      aria-hidden="true"
                      className="h-[18px] w-[18px]"
                      strokeWidth={1.4}
                    />
                    PCI DSS
                  </span>

                  <span
                    aria-hidden="true"
                    className="hidden h-5 w-px bg-border sm:block"
                  />

                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Lock
                      aria-hidden="true"
                      className="h-[17px] w-[17px]"
                      strokeWidth={1.4}
                    />
                    SSL Secure
                  </span>

                  <span
                    aria-hidden="true"
                    className="hidden h-5 w-px bg-border sm:block"
                  />

                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Building2
                      aria-hidden="true"
                      className="h-[18px] w-[18px]"
                      strokeWidth={1.4}
                    />
                    Local Banking
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Support */}
      <p className="mt-8 flex flex-wrap items-center justify-center gap-1.5 text-[14px] text-text-muted">
        <span>Need assistance with your booking?</span>

        <a
          href="/contact"
          className="inline-flex items-center gap-2 border-b border-text font-semibold text-text transition-opacity hover:opacity-65"
        >
          Contact Support

          <ArrowRight
            aria-hidden="true"
            className="h-[18px] w-[18px]"
            strokeWidth={1.8}
          />
        </a>
      </p>
    </Container>
  )
}