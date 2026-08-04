<?php

namespace App\Exceptions\Booking;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Raised when the final, in-transaction allocation check finds one or more
 * requested slots with zero free courts. Never mentions which/how many
 * courts were considered — only the requested date/start_time/end_time.
 */
class SlotUnavailableException extends RuntimeException
{
    /**
     * @param  array<int, array{date: string, start_time: string, end_time: string}>  $unavailableSlots
     */
    public function __construct(private readonly array $unavailableSlots)
    {
        parent::__construct('One or more selected slots are no longer available.');
    }

    /**
     * @return array<int, array{date: string, start_time: string, end_time: string}>
     */
    public function unavailableSlots(): array
    {
        return $this->unavailableSlots;
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error_code' => 'SLOT_UNAVAILABLE',
            'meta' => ['unavailable_slots' => $this->unavailableSlots],
        ], 409);
    }
}
