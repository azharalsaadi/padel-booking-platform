<?php

namespace App\Exceptions\Pricing;

use RuntimeException;

/**
 * The slot selection itself is malformed (empty, non-60-minute duration,
 * duplicate entries) — a defense-in-depth backstop behind request
 * validation, since PricingService must never trust its caller blindly.
 */
class InvalidSlotSelectionException extends RuntimeException
{
    public function render(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error_code' => 'INVALID_SLOT_SELECTION',
        ], 422);
    }
}
