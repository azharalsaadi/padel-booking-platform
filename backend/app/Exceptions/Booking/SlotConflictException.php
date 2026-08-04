<?php

namespace App\Exceptions\Booking;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

/**
 * The database-level backstop: the booking_slots.lock_key unique index
 * rejected an insert despite application-level row locking having found
 * the slot free. Should be rare (only under a genuine race the locking
 * missed) but must still surface as a clean, non-leaking 409 rather than
 * a raw SQL error, and the caller's transaction rolls back either way.
 */
class SlotConflictException extends RuntimeException
{
    public function __construct(?Throwable $previous = null)
    {
        parent::__construct('One or more selected slots were just booked by someone else.', previous: $previous);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error_code' => 'SLOT_UNAVAILABLE',
        ], 409);
    }
}
