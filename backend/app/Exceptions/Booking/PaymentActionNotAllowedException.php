<?php

namespace App\Exceptions\Booking;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Covers every "the requested admin payment action does not apply to this
 * booking/payment in its current state" case — currently just
 * mark-paid-at-venue — with one class, parameterized by error_code.
 * Mirrors BookingActionNotAllowedException's shape but is kept separate
 * since that one is specifically about guest self-service actions.
 */
class PaymentActionNotAllowedException extends RuntimeException
{
    public function __construct(private readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }

    public static function markPaidNotAllowed(): self
    {
        return new self(
            'MARK_PAID_NOT_ALLOWED',
            'Only a pending pay-at-venue payment on an active booking can be marked as paid.',
        );
    }

    public static function alreadyPaid(): self
    {
        return new self('PAYMENT_ALREADY_RESOLVED', 'This payment has already been resolved.');
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error_code' => $this->errorCode,
        ], 409);
    }
}
