import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { DateStrip } from '@/components/booking/DateStrip'
import { SlotGrid } from '@/components/booking/SlotGrid'
import { SelectedSlotsList } from '@/components/booking/SelectedSlotsList'
import { SelectedSlotsReview } from '@/components/booking/SelectedSlotsReview'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { CustomerInfoForm } from '@/components/booking/CustomerInfoForm'
import type { CustomerFormErrors, CustomerFormValues } from '@/components/booking/CustomerInfoForm'
import { PaymentMethodSelector } from '@/components/booking/PaymentMethodSelector'
import { useBookingCartStore } from '@/store/bookingCart'
import { useAvailability } from '@/hooks/useAvailability'
import { useQuote } from '@/hooks/useQuote'
import { useCreateBooking } from '@/hooks/useCreateBooking'
import { parseApiError } from '@/api/errors'
import { isValidOmaniPhone } from '@/lib/phone'
import type { AvailabilitySlot, PaymentMethod } from '@/types/api'

type Step = 1 | 2 | 3

const STEP_TITLES: Record<Step, string> = {
  1: 'Select date and times',
  2: 'Review your selection',
  3: 'Your details and payment',
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-3" aria-label="Booking progress">
      {([1, 2, 3] as Step[]).map((value) => (
        <li key={value} className="flex items-center gap-3">
          <span
            aria-current={step === value ? 'step' : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
              step === value ? 'bg-primary text-white' : 'bg-secondary-100 text-primary-700'
            }`}
          >
            {value}
          </span>
          {value < 3 && (
            <span
              aria-hidden="true"
              className={`h-px w-10 ${value <= step ? 'bg-primary' : 'bg-border'}`}
            />
          )}
        </li>
      ))}
    </ol>
  )
}

export function BookingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [customer, setCustomer] = useState<CustomerFormValues>({ phone: '', name: '', email: '', notes: '' })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [formErrors, setFormErrors] = useState<CustomerFormErrors>({})
  const [paymentMethodError, setPaymentMethodError] = useState<string | undefined>()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const slots = useBookingCartStore((state) => state.slots)
  const addSlot = useBookingCartStore((state) => state.addSlot)
  const removeSlot = useBookingCartStore((state) => state.removeSlot)
  const hasSlot = useBookingCartStore((state) => state.hasSlot)
  const clearCart = useBookingCartStore((state) => state.clear)

  const availability = useAvailability(selectedDate)
  const quote = useQuote(slots)
  const createBooking = useCreateBooking()

  function handleToggleSlot(slot: AvailabilitySlot) {
    if (hasSlot(slot.date, slot.start_time)) {
      removeSlot(slot)
    } else {
      addSlot({ date: slot.date, start_time: slot.start_time, end_time: slot.end_time })
    }
  }

  function validateCustomerStep(): boolean {
    const errors: CustomerFormErrors = {}

    if (!isValidOmaniPhone(customer.phone)) {
      errors.phone = 'Enter a valid Omani phone number, e.g. +96891234567.'
    }
    if (customer.email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(customer.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }

    const paymentValid = paymentMethod !== ''
    setFormErrors(errors)
    setPaymentMethodError(paymentValid ? undefined : 'Choose a payment method.')

    return Object.keys(errors).length === 0 && paymentValid
  }

  function handleSubmit() {
    setSubmitError(null)
    if (!validateCustomerStep()) return

    createBooking.mutate(
      {
        customer_phone: customer.phone.trim(),
        customer_name: customer.name.trim() || null,
        customer_email: customer.email.trim() || null,
        notes: customer.notes.trim() || null,
        payment_method: paymentMethod as PaymentMethod,
        slots,
      },
      {
        onSuccess: (booking) => {
          clearCart()

          // Thawani: skip the intermediate success page entirely and go
          // straight to checkout — the customer only ever sees a
          // "confirmed" page once the test payment itself succeeds (via
          // ProcessingPage, reached from the mock checkout page's own
          // redirect). Falls back to the success page's existing
          // "couldn't start online payment" messaging in the rare case
          // Thawani session creation failed and there's no checkout_url
          // to send them to.
          if (booking.payment_method === 'thawani' && booking.checkout_url) {
            window.location.assign(booking.checkout_url)
            return
          }

          navigate('/booking/success', { state: { booking } })
        },
        onError: (error) => {
          setSubmitError(parseApiError(error).message)
        },
      },
    )
  }

  return (
    <Container className="flex flex-col gap-6 py-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-serif text-3xl font-semibold text-text sm:text-4xl">
          Step {step} of 3: {STEP_TITLES[step]}
        </h1>
        <StepIndicator step={step} />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {step === 1 && (
            <>
              <Card className="flex flex-col gap-4">
                <h2 className="font-serif text-xl font-semibold text-text">Choose a date</h2>
                <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              </Card>

              {selectedDate && (
                <Card className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-serif text-xl font-semibold text-text">Available times</h2>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-secondary-300" />
                        Available
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />
                        Selected
                      </span>
                    </div>
                  </div>
                  <SlotGrid
                    date={selectedDate}
                    slots={availability.data}
                    isLoading={availability.isLoading}
                    isError={availability.isError}
                    onRetry={() => availability.refetch()}
                    isSelected={hasSlot}
                    onToggle={handleToggleSlot}
                  />
                </Card>
              )}

              <Card className="flex flex-col gap-4">
                <h2 className="font-serif text-xl font-semibold text-text">Your Booking</h2>
                <SelectedSlotsList slots={slots} onRemove={removeSlot} />
              </Card>
            </>
          )}

          {step === 2 && (
            <>
              <Card className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Selected slots</p>
                  <h2 className="font-serif text-xl font-semibold text-text">Your Selected Sessions</h2>
                </div>
                <SelectedSlotsReview
                  slots={slots}
                  onRemove={removeSlot}
                  pricePerHourBaisa={quote.data?.applied_rule.price_per_hour_baisa}
                  currency={quote.data?.currency ?? 'OMR'}
                />
              </Card>

              <div className="flex gap-3 rounded-r-card border-l-4 border-primary bg-background p-4 text-sm text-text">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="none">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M10 9v4.5M10 6.75h.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="font-semibold">Cancellation policy</p>
                  <p className="mt-1 text-text-muted">
                    Once confirmed, you can cancel this booking at any time before payment is settled online or the
                    session begins. No refund is issued automatically.
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Card className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-secondary-100 text-primary-700">
                    <User aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <h2 className="font-serif text-xl font-semibold text-text">Your details</h2>
                </div>
                <CustomerInfoForm values={customer} errors={formErrors} onChange={(patch) => setCustomer((c) => ({ ...c, ...patch }))} />
              </Card>
              <Card className="flex flex-col gap-4">
                <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} error={paymentMethodError} />
              </Card>
              {submitError && <ErrorMessage message={submitError} />}
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-4 flex flex-col gap-4">
            <h2 className="font-serif text-xl font-semibold text-text">
              {step === 2 ? 'Booking Summary' : 'Price summary'}
            </h2>
            <BookingSummary
              quote={quote.data}
              isLoading={quote.isLoading}
              isError={quote.isError}
              onRetry={() => quote.refetch()}
            />

            <div className="flex flex-col gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)}>
                  {step === 2 ? 'Back to selection' : 'Back'}
                </Button>
              )}
              {step < 3 && (
                <Button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={
                    slots.length === 0 ||
                    // Step 2 -> 3 must never proceed without a successfully
                    // loaded quote showing every slot still available —
                    // otherwise the customer reaches payment having never
                    // seen a real price (the backend would still price it
                    // correctly, but the customer wouldn't have agreed to it).
                    (step === 2 && (quote.isLoading || quote.isError || quote.data?.all_slots_available === false))
                  }
                >
                  {step === 2 ? 'Continue to payment' : 'Continue'}
                </Button>
              )}
              {step === 3 && (
                <Button onClick={handleSubmit} isLoading={createBooking.isPending}>
                  Complete booking
                </Button>
              )}
            </div>

            {step === 1 && (
              <p className="text-center text-xs font-medium tracking-wide text-text-muted uppercase">
                Premium experience guaranteed
              </p>
            )}
            {(step === 2 || step === 3) && (
              <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium tracking-wide text-text-muted uppercase">
                <Lock aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
                {step === 2 ? 'Secure payment via Thawani' : 'Encrypted & secure payments'}
              </p>
            )}
          </Card>

          {step === 1 && (
            <p className="mt-4 text-center text-sm text-text-muted italic">
              Need assistance? <span className="underline">Contact support</span>
            </p>
          )}
        </div>
      </div>
    </Container>
  )
}
