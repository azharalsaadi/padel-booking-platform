<?php

namespace App\Services;

use App\Contracts\ThawaniGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Support\Str;

/**
 * Stand-in for ThawaniService when no real Sandbox credentials exist
 * (THAWANI_MODE=mock, local/testing only — see isActive()). "Creating a
 * checkout session" here is purely local: a random session id and a URL
 * pointing at this app's own frontend mock checkout page. Nothing is ever
 * sent to the real UAT API and no secret/publishable key is read.
 *
 * The mock checkout page (MockThawaniController) applies its outcome via
 * PaymentService::applyMockResult(), which reuses the exact same
 * verified-status transition logic a real webhook uses — this class never
 * mutates a booking/payment itself.
 */
class MockThawaniService implements ThawaniGateway
{
    /**
     * Single source of truth for "is mock mode really active" — used to
     * decide the container binding (AppServiceProvider), whether the mock
     * routes are registered at all (routes/api.php, decided once at
     * boot), and as a redundant per-request check in their middleware.
     * Reads config('app.env') rather than app()->environment() so tests
     * can toggle it with a plain config() override.
     */
    public static function isActive(): bool
    {
        return config('thawani.mode') === 'mock'
            && in_array(config('app.env'), ['local', 'testing'], true);
    }

    public function createCheckoutSession(
        string $clientReferenceId,
        int $amountBaisa,
        string $successUrl,
        string $cancelUrl,
    ): array {
        $sessionId = 'mock_'.Str::random(32);

        return [
            'session_id' => $sessionId,
            'checkout_url' => rtrim((string) config('app.frontend_url'), '/')."/mock-thawani/{$sessionId}",
        ];
    }

    /**
     * There is no real remote session to query in mock mode — the mock
     * checkout page's succeed/fail actions apply the outcome directly.
     * This simply reflects back whatever is already persisted, so
     * PaymentService::refreshPaymentStatus() stays correct and idempotent
     * even if it's called before the customer has acted on the page.
     */
    public function retrieveSession(string $sessionId): array
    {
        $payment = Payment::where('thawani_session_id', $sessionId)->first();

        $status = match ($payment?->status) {
            PaymentStatus::Paid => 'paid',
            PaymentStatus::Failed, PaymentStatus::Cancelled => 'cancelled',
            default => 'unpaid',
        };

        return [
            'session_id' => $sessionId,
            'payment_status' => $status,
            'raw' => ['mock' => true],
        ];
    }
}
