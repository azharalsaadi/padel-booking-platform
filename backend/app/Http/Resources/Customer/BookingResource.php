<?php

namespace App\Http\Resources\Customer;

use App\Enums\BookingStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Whitelists exactly the customer-safe booking fields. Court identity is
 * withheld everywhere except one deliberate exception: each slot's
 * court_name is included only once the booking is fully confirmed and
 * paid (see Court model docblock) — never the court id, and never for
 * pending/failed/cancelled/expired bookings.
 */
class BookingResource extends JsonResource
{
    /**
     * access_token is a one-time guest credential: the customer must see
     * it once, at booking creation, to save it — but it must never appear
     * again in lookup/cancel/retry/refresh responses, which already
     * identify the booking via the token the guest supplied. False by
     * default; BookingController::store() and MockThawaniController's
     * succeed()/fail() (mock-mode only) are the only callers that opt in.
     */
    private bool $includeAccessToken = false;

    public function includeAccessToken(): static
    {
        $this->includeAccessToken = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $payment = $this->payments->sortByDesc('id')->first();
        $isThawani = $this->payment_method === PaymentMethod::Thawani;
        $isConfirmedAndPaid = $this->status === BookingStatus::Confirmed && $payment?->status === PaymentStatus::Paid;

        return [
            'booking_reference' => $this->booking_reference,
            'access_token' => $this->when($this->includeAccessToken, $this->access_token),
            // Named distinctly from payment_status below — a booking and
            // its payment are two different state machines.
            'booking_status' => $this->status->value,
            'payment_method' => $this->payment_method->value,
            'payment_status' => $payment?->status->value,
            'currency' => $this->currency,
            'total_hours' => $this->bookingSlots->count(),
            'total_price_baisa' => $this->total_price_baisa,
            // Present only for Thawani bookings, per the locked contract —
            // never appears at all for pay_at_venue, not even as null.
            'checkout_url' => $this->when($isThawani, fn () => $payment?->checkout_url),
            // Present only while a Thawani payment is still pending — once
            // confirmed or expired, the hold is no longer relevant.
            'hold_expires_at' => $this->when(
                $isThawani && $this->status === BookingStatus::PendingPayment,
                fn () => $this->hold_expires_at?->toIso8601String()
            ),
            'customer_phone' => $this->customer_phone,
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'notes' => $this->notes,
            // Built with array spread rather than $this->when(): the
            // MissingValue sentinel that when() relies on is only filtered
            // out of a plain array by JsonResource's automatic recursion,
            // and this ->map() result stays a Collection (not cast to a
            // plain array) — spread guarantees court_name is genuinely
            // absent from the JSON rather than leaking as an empty value.
            'slots' => $this->bookingSlots
                ->sortBy([['date', 'asc'], ['start_time', 'asc']])
                ->values()
                ->map(fn ($slot) => [
                    'date' => $slot->date->toDateString(),
                    'start_time' => substr($slot->start_time, 0, 5),
                    'end_time' => substr($slot->end_time, 0, 5),
                    'price_baisa' => $slot->price_baisa,
                    ...($isConfirmedAndPaid ? ['court_name' => $slot->court?->name] : []),
                ]),
        ];
    }
}
