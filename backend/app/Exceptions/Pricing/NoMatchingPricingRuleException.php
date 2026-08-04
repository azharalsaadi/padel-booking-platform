<?php

namespace App\Exceptions\Pricing;

use RuntimeException;

/**
 * No active pricing_rules row covers the requested hour count — a
 * configuration gap, not a malformed request, hence a 409 conflict rather
 * than a 422 validation error.
 */
class NoMatchingPricingRuleException extends RuntimeException
{
    public function render(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error_code' => 'NO_MATCHING_PRICING_RULE',
        ], 409);
    }
}
