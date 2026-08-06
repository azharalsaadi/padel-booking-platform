<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\Customer\BookingResource;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;

/**
 * Backs the local mock Thawani checkout page (THAWANI_MODE=mock, any
 * environment including production — every route here sits behind the
 * 'thawani.mock' middleware, see EnsureThawaniMockActive and
 * MockThawaniService::isActive()).
 *
 * Every action is scoped by the unguessable mock session id embedded in
 * the checkout_url the customer already holds from booking creation —
 * the same trust model this app already uses for access_token-scoped
 * guest actions. There is no booking-id-based lookup anywhere here, so
 * this can never be used to mark an arbitrary booking as paid.
 */
class MockThawaniController extends Controller
{
    public function __construct(private readonly PaymentService $paymentService) {}

    public function show(string $sessionId): JsonResponse
    {
        $payment = $this->findPayment($sessionId);
        $booking = $payment->booking;

        return response()->json(['data' => [
            'booking_reference' => $booking->booking_reference,
            'total_price_baisa' => $booking->total_price_baisa,
            'currency' => $booking->currency,
            'payment_status' => $payment->status->value,
        ]]);
    }

    public function succeed(string $sessionId): BookingResource
    {
        $payment = $this->findPayment($sessionId);
        $booking = $this->paymentService->applyMockResult($payment, 'paid');

        return (new BookingResource($booking))->includeAccessToken();
    }

    public function fail(string $sessionId): BookingResource
    {
        $payment = $this->findPayment($sessionId);
        $booking = $this->paymentService->applyMockResult($payment, 'cancelled');

        return (new BookingResource($booking))->includeAccessToken();
    }

    private function findPayment(string $sessionId): Payment
    {
        return Payment::where('thawani_session_id', $sessionId)->firstOrFail();
    }
}
