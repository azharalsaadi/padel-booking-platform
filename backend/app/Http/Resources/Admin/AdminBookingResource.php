<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin-only: unlike the customer-facing BookingResource, this may
 * include court identity — that restriction only applies to
 * customer-facing responses.
 */
class AdminBookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $payment = $this->payments->sortByDesc('id')->first();

        return [
            'id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'booking_status' => $this->status->value,
            'payment_method' => $this->payment_method->value,
            'payment_status' => $payment?->status->value,
            'paid_at' => $payment?->paid_at?->toIso8601String(),
            'currency' => $this->currency,
            'total_price_baisa' => $this->total_price_baisa,
            'customer_phone' => $this->customer_phone,
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'notes' => $this->notes,
            'hold_expires_at' => $this->hold_expires_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'slots' => $this->bookingSlots
                ->sortBy([['date', 'asc'], ['start_time', 'asc']])
                ->values()
                ->map(fn ($slot) => [
                    'date' => $slot->date->toDateString(),
                    'start_time' => substr($slot->start_time, 0, 5),
                    'end_time' => substr($slot->end_time, 0, 5),
                    'price_baisa' => $slot->price_baisa,
                    'court_id' => $slot->court_id,
                    'court_name' => $slot->court?->name,
                ]),
        ];
    }
}
