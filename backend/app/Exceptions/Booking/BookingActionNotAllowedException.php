<?php

namespace App\Exceptions\Booking;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Covers every "the requested guest action does not apply to this booking
 * in its current state" case (cancel/retry-payment) with one class,
 * parameterized by error_code — cancellation-not-allowed,
 * already-resolved, hold-expired, retry-not-allowed. Never reveals
 * anything about court identity or internal state beyond the message.
 */
class BookingActionNotAllowedException extends RuntimeException
{
    public function __construct(private readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }

    public static function cancellationNotAllowed(): self
    {
        return new self('CANCELLATION_NOT_ALLOWED', 'This booking can no longer be cancelled.');
    }

    public static function alreadyResolved(): self
    {
        return new self('BOOKING_ALREADY_RESOLVED', 'This booking has already been resolved and cannot be changed.');
    }

    public static function paymentHoldExpired(): self
    {
        return new self('PAYMENT_HOLD_EXPIRED', 'The payment hold for this booking has expired.');
    }

    public static function retryNotAllowed(): self
    {
        return new self('RETRY_NOT_ALLOWED', 'Payment retry is not available for this booking.');
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error_code' => $this->errorCode,
        ], 409);
    }
}
