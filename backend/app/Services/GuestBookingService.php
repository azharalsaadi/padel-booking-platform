<?php

namespace App\Services;

use App\Enums\BookingSlotStatus;
use App\Enums\BookingStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\Booking\BookingActionNotAllowedException;
use App\Exceptions\Booking\ThawaniUnavailableException;
use App\Models\Booking;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Guest-facing booking actions (Step 12) — lookup, cancel, payment retry,
 * payment refresh. Deliberately thin on payment/allocation logic: every
 * Thawani call and every state-transition rule reuses PaymentService
 * (Step 10) rather than re-implementing it here.
 */
class GuestBookingService
{
    public function __construct(private readonly PaymentService $paymentService) {}

    /**
     * Throws ModelNotFoundException on an invalid token, which Laravel's
     * default exception handler already renders as a generic 404 JSON
     * response — no separate "does this token exist" branch to leak via.
     */
    public function findByToken(string $accessToken): Booking
    {
        return Booking::where('access_token', $accessToken)
            ->with(['bookingSlots.court', 'payments'])
            ->firstOrFail();
    }

    public function cancel(Booking $booking): Booking
    {
        return DB::transaction(function () use ($booking) {
            $locked = Booking::whereKey($booking->id)->lockForUpdate()->with('bookingSlots')->first();

            $this->assertCancellable($locked);

            $locked->status = BookingStatus::Cancelled;
            $locked->cancelled_at = now();
            $locked->cancellation_reason = 'Cancelled by customer.';
            $locked->save();

            $locked->bookingSlots()
                ->whereIn('status', [BookingSlotStatus::PendingPayment, BookingSlotStatus::Confirmed])
                ->update(['status' => BookingSlotStatus::Cancelled]);

            // Payment rows are never deleted (kept for audit) — only a
            // still-open Pending payment is marked Cancelled alongside it.
            // No refund is issued here, by design.
            Payment::where('booking_id', $locked->id)
                ->where('status', PaymentStatus::Pending)
                ->update(['status' => PaymentStatus::Cancelled]);

            return $locked->fresh(['bookingSlots', 'payments']);
        });
    }

    /**
     * Reuses PaymentService::issueCheckoutSession (Step 10) for the actual
     * Thawani call. That method never throws on failure — it logs a
     * warning and returns the payment unchanged — so a failed retry is
     * detected here by comparing the session id before/after the call,
     * not by catching an exception.
     */
    public function retryPayment(Booking $booking): Booking
    {
        DB::transaction(function () use ($booking) {
            $locked = Booking::whereKey($booking->id)->lockForUpdate()->first();
            $this->assertRetryable($locked);
        });

        $currentPayment = $booking->payments()->latest('id')->first();
        $sessionIdBefore = $currentPayment?->thawani_session_id;

        $updatedPayment = $this->paymentService->issueCheckoutSession($booking);

        if ($updatedPayment === null || $updatedPayment->thawani_session_id === $sessionIdBefore) {
            throw new ThawaniUnavailableException();
        }

        return $booking->fresh(['bookingSlots', 'payments']);
    }

    /**
     * Reuses PaymentService::refreshPaymentStatus (Step 12 addition to the
     * Step 10 service), which itself re-verifies against Thawani's own API
     * before applying anything — this method never trusts the frontend.
     */
    public function refreshPayment(Booking $booking): Booking
    {
        if ($booking->payment_method !== PaymentMethod::Thawani) {
            return $booking;
        }

        try {
            return $this->paymentService->refreshPaymentStatus($booking);
        } catch (Throwable $e) {
            throw new ThawaniUnavailableException($e);
        }
    }

    private function assertCancellable(Booking $booking): void
    {
        if (in_array($booking->status, [BookingStatus::Cancelled, BookingStatus::Expired], true)) {
            throw BookingActionNotAllowedException::alreadyResolved();
        }

        // Paid Thawani bookings are not auto-refunded, so self-service
        // cancellation does not apply to them.
        if ($booking->payment_method === PaymentMethod::Thawani && $booking->status === BookingStatus::Confirmed) {
            throw BookingActionNotAllowedException::cancellationNotAllowed();
        }

        if ($booking->status === BookingStatus::Confirmed && ! $this->earliestSlotIsInFuture($booking)) {
            throw BookingActionNotAllowedException::cancellationNotAllowed();
        }
    }

    private function assertRetryable(Booking $booking): void
    {
        if (in_array($booking->status, [BookingStatus::Cancelled, BookingStatus::Expired], true)) {
            throw BookingActionNotAllowedException::alreadyResolved();
        }

        if ($booking->payment_method !== PaymentMethod::Thawani || $booking->status !== BookingStatus::PendingPayment) {
            throw BookingActionNotAllowedException::retryNotAllowed();
        }

        if ($booking->hold_expires_at !== null && $booking->hold_expires_at->isPast()) {
            throw BookingActionNotAllowedException::paymentHoldExpired();
        }
    }

    private function earliestSlotIsInFuture(Booking $booking): bool
    {
        $earliest = $booking->bookingSlots
            ->sortBy([['date', 'asc'], ['start_time', 'asc']])
            ->first();

        if ($earliest === null) {
            return true;
        }

        return Carbon::parse($earliest->date->toDateString().' '.$earliest->start_time)->isFuture();
    }
}
