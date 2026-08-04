import type { QuoteResponse } from '@/types/api'
import { formatBaisa } from '@/lib/money'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'

interface BookingSummaryProps {
  quote: QuoteResponse | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  /** Condensed single-line variant for staying visible while scrolling on mobile. */
  compact?: boolean
}

/**
 * Every number here comes straight from the backend's quote response —
 * this component performs no pricing math of its own, per the
 * "authoritative prices always come from the backend" requirement.
 */
export function BookingSummary({ quote, isLoading, isError, onRetry, compact = false }: BookingSummaryProps) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading price" className="flex flex-col gap-2">
        <Skeleton className="h-5 w-2/3" />
        {!compact && <Skeleton className="h-4 w-1/2" />}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Could not load pricing"
        message="We couldn't calculate the price for your selection."
        action={
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        }
      />
    )
  }

  if (!quote) {
    return <p className="text-sm text-text-muted">Select at least one time slot to see pricing.</p>
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-muted">
          {quote.total_hours} hour{quote.total_hours === 1 ? '' : 's'}
        </span>
        <span className="font-semibold text-text">{formatBaisa(quote.total_price_baisa, quote.currency)}</span>
      </div>
    )
  }

  return (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-text-muted">Total hours</dt>
        <dd className="text-text">{quote.total_hours}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-text-muted">Price per hour</dt>
        <dd className="text-text">{formatBaisa(quote.applied_rule.price_per_hour_baisa, quote.currency)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-text-muted">Standard subtotal</dt>
        <dd className="text-text">{formatBaisa(quote.standard_subtotal_baisa, quote.currency)}</dd>
      </div>
      {quote.discount_baisa > 0 && (
        <div className="flex justify-between">
          <dt className="text-success">Discount</dt>
          <dd className="text-success">&minus;{formatBaisa(quote.discount_baisa, quote.currency)}</dd>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <dt className="font-serif text-xl font-semibold text-text">Total</dt>
        <dd className="font-serif text-xl font-semibold text-text">{formatBaisa(quote.total_price_baisa, quote.currency)}</dd>
      </div>
      {!quote.all_slots_available && (
        <p role="alert" className="mt-1 text-sm text-danger">
          One or more selected times are no longer available. Please review your selection.
        </p>
      )}
    </dl>
  )
}
