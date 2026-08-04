<?php

namespace App\Exceptions\Booking;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

/**
 * Thawani's API failed or was unreachable while servicing a guest request
 * (retry-payment / refresh-payment). A safe, retryable 502 — never leaks
 * the underlying HTTP/SDK exception message.
 */
class ThawaniUnavailableException extends RuntimeException
{
    public function __construct(?Throwable $previous = null)
    {
        parent::__construct('The payment provider is temporarily unavailable. Please try again shortly.', previous: $previous);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error_code' => 'THAWANI_UNAVAILABLE',
        ], 502);
    }
}
