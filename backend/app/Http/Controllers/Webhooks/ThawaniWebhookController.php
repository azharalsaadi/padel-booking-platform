<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class ThawaniWebhookController extends Controller
{
    public function __construct(private readonly PaymentService $paymentService) {}

    /**
     * Always returns 200 (even for a payload we can't act on) — returning
     * an error status here would make Thawani retry indefinitely, and
     * every code path in PaymentService::handleWebhookEvent() is already
     * a safe, idempotent no-op for anything it can't resolve.
     */
    public function handle(Request $request): JsonResponse
    {
        try {
            $this->paymentService->handleWebhookEvent($request->all());
        } catch (Throwable $e) {
            Log::error('Thawani webhook handling failed.', ['exception' => $e->getMessage()]);
        }

        return response()->json(['received' => true]);
    }
}
