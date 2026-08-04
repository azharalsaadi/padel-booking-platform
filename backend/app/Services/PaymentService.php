<?php

namespace App\Services;

use App\Contracts\ThawaniGateway;
use App\Enums\BookingSlotStatus;
use App\Enums\BookingStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\Booking\PaymentActionNotAllowedException;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PaymentService
{
    public function __construct(private readonly ThawaniGateway $thawaniService) {}

    /**
     * Issues a Thawani checkout session for a booking's payment record.
     * MUST be called AFTER the booking transaction has already committed
     * (never inside the allocation/locking transaction) — this makes an
     * external HTTP call, which should never hold a database transaction
     * open. If it fails, the booking still exists as pending_payment; the
     * customer can retry later (a future step) and the hold-expiry job
     * reclaims the slot if they never do.
     */
    public function issueCheckoutSession(Booking $booking): ?Payment
    {
        $payment = $booking->payments()->latest('id')->first();

        if ($payment === null) {
            return null;
        }

        try {
            $session = $this->thawaniService->createCheckoutSession(
                clientReferenceId: $booking->booking_reference,
                amountBaisa: $payment->amount_baisa,
                successUrl: $this->frontendUrl("/booking/{$booking->access_token}/processing"),
                cancelUrl: $this->frontendUrl("/booking/{$booking->access_token}/failed"),
            );
        } catch (Throwable $e) {
            Log::warning('Thawani checkout session creation failed.', [
                'booking_reference' => $booking->booking_reference,
                'exception' => $e->getMessage(),
            ]);

            return $payment;
        }

        // thawani_session_id/checkout_url are excluded from Payment::$fillable
        // (see Step 4/9) — set via direct attribute assignment, as designed.
        $payment->thawani_session_id = $session['session_id'];
        $payment->checkout_url = $session['checkout_url'];
        $payment->save();

        return $payment;
    }

    /**
     * Idempotent: a duplicate event_reference is a silent no-op (the
     * unique index on webhook_events(provider, event_reference) is what
     * enforces this). Never trusts the webhook payload's own status field
     * directly — always re-verifies against Thawani's own API before
     * mutating anything, exactly as the frozen architecture requires.
     */
    public function handleWebhookEvent(array $payload): void
    {
        $sessionId = $this->extractSessionIdFromWebhook($payload);
        $eventReference = $sessionId ?? md5(json_encode($payload));

        $inserted = DB::table('webhook_events')->insertOrIgnore([
            'provider' => 'thawani',
            'event_reference' => $eventReference,
            'payload' => json_encode($payload),
            'created_at' => now(),
        ]);

        if (! $inserted || $sessionId === null) {
            return; // duplicate delivery, or nothing usable in the payload
        }

        $payment = Payment::where('thawani_session_id', $sessionId)->first();

        if ($payment === null) {
            return;
        }

        $verified = $this->thawaniService->retrieveSession($sessionId);
        $this->applyVerifiedStatus($payment->id, $verified['payment_status']);
    }

    /**
     * Customer-triggered refresh (Step 12): re-verifies the booking's
     * latest payment against Thawani's own API and applies the result via
     * the exact same code path a webhook uses — never trusts anything the
     * frontend claims about payment success. A pure addition alongside
     * handleWebhookEvent(); that method is unchanged.
     */
    public function refreshPaymentStatus(Booking $booking): Booking
    {
        $payment = $booking->payments()->latest('id')->first();

        if ($payment === null || $payment->thawani_session_id === null) {
            return $booking;
        }

        $verified = $this->thawaniService->retrieveSession($payment->thawani_session_id);
        $this->applyVerifiedStatus($payment->id, $verified['payment_status']);

        return $booking->fresh(['bookingSlots', 'payments']);
    }

    /**
     * Mock-checkout counterpart to a real Thawani webhook (MockThawaniController
     * only, itself gated to MockThawaniService::isActive()). Applies the
     * exact same verified-status transition as handleWebhookEvent/
     * refreshPaymentStatus — paid confirms the booking and its slots,
     * cancelled/failed expires it and frees them, anything already
     * resolved is an idempotent no-op — nothing about the transition rules
     * themselves is duplicated or reimplemented here.
     */
    public function applyMockResult(Payment $payment, string $result): Booking
    {
        $this->applyVerifiedStatus($payment->id, $result);

        return $payment->booking()->with(['bookingSlots', 'payments'])->firstOrFail();
    }

    /**
     * Admin-only (AdminBookingController::markPaid): confirms cash/card
     * collected at the venue for a pay-at-venue booking. Unlike
     * applyVerifiedStatus, this never touches booking_status or slot
     * status — a pay-at-venue booking is already confirmed the moment it's
     * created (BookingCreationService); only its payment sub-record is
     * still pending until the venue collects it. Rejects (never silently
     * no-ops) anything already resolved or not a pending pay-at-venue
     * payment on an active booking — this is an explicit admin action, not
     * a possibly-duplicate webhook delivery.
     */
    public function markPayAtVenuePaid(Booking $booking): Booking
    {
        return DB::transaction(function () use ($booking) {
            $locked = Booking::whereKey($booking->id)->lockForUpdate()->first();
            $payment = Payment::where('booking_id', $locked->id)->latest('id')->lockForUpdate()->first();

            $this->assertMarkPaidAllowed($locked, $payment);

            $payment->status = PaymentStatus::Paid;
            $payment->paid_at = now();
            $payment->save();

            return $booking->fresh(['bookingSlots', 'payments']);
        });
    }

    private function assertMarkPaidAllowed(Booking $booking, ?Payment $payment): void
    {
        if ($payment === null || $booking->payment_method !== PaymentMethod::PayAtVenue) {
            throw PaymentActionNotAllowedException::markPaidNotAllowed();
        }

        if (in_array($booking->status, [BookingStatus::Cancelled, BookingStatus::Expired], true)) {
            throw PaymentActionNotAllowedException::markPaidNotAllowed();
        }

        if ($payment->status !== PaymentStatus::Pending) {
            throw PaymentActionNotAllowedException::alreadyPaid();
        }
    }

    private function applyVerifiedStatus(int $paymentId, string $verifiedStatus): void
    {
        DB::transaction(function () use ($paymentId, $verifiedStatus) {
            $payment = Payment::whereKey($paymentId)->lockForUpdate()->first();

            if ($payment === null) {
                return;
            }

            $booking = Booking::whereKey($payment->booking_id)->lockForUpdate()->first();

            if ($payment->status !== PaymentStatus::Pending || $booking->status !== BookingStatus::PendingPayment) {
                return; // already resolved — idempotent no-op
            }

            if ($this->isPaid($verifiedStatus)) {
                $payment->status = PaymentStatus::Paid;
                $payment->paid_at = now();
                $payment->save();

                $booking->status = BookingStatus::Confirmed;
                $booking->confirmed_at = now();
                $booking->save();

                $booking->bookingSlots()->update(['status' => BookingSlotStatus::Confirmed]);
            } elseif ($this->isFailed($verifiedStatus)) {
                $payment->status = PaymentStatus::Failed;
                $payment->failed_at = now();
                $payment->save();

                // Frees the slots immediately (lock_key nulls out) rather
                // than waiting for the hold-expiry job.
                $booking->status = BookingStatus::Expired;
                $booking->save();

                $booking->bookingSlots()->update(['status' => BookingSlotStatus::Expired]);
            }
            // Any other status (e.g. still pending on Thawani's side):
            // leave everything as pending_payment, unresolved for now.
        });
    }

    private function isPaid(string $status): bool
    {
        return in_array(strtolower($status), ['paid', 'succeeded', 'success'], true);
    }

    private function isFailed(string $status): bool
    {
        return in_array(strtolower($status), ['failed', 'cancelled', 'canceled', 'expired'], true);
    }

    /**
     * PLACEHOLDER — the real webhook payload shape is unverified (see
     * ThawaniService docblock). Tries a few plausible key names
     * defensively; harmless if wrong, since nothing is trusted from this
     * value except as a lookup key — the actual status always comes from
     * retrieveSession().
     */
    private function extractSessionIdFromWebhook(array $payload): ?string
    {
        return $payload['data']['session_id']
            ?? $payload['session_id']
            ?? $payload['data']['client_reference_id']
            ?? null;
    }

    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('app.frontend_url'), '/').$path;
    }
}
