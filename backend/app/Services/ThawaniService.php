<?php

namespace App\Services;

use App\Contracts\ThawaniGateway;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin HTTP client for the Thawani Sandbox Checkout API.
 *
 * The official Stoplight reference is a JS-rendered SPA still unreadable by
 * this project's fetch tools — the primary source has never been read
 * directly (see config/thawani.php for the specifics). The request/response
 * shape below is cross-verified against several independent real-world
 * Thawani integrations that agree with each other: POST /checkout/session
 * takes {client_reference_id, mode, products: [{name, quantity,
 * unit_amount}], success_url, cancel_url}; both create and retrieve
 * responses wrap their payload as {success, code, data: {session_id,
 * payment_status, ...}} — hence extractSessionId/extractPaymentStatus
 * checking $body['data'][...] first; payment_status is one of
 * paid/unpaid/cancelled, matching PaymentService::isPaid()/isFailed().
 * Strongly corroborated, not primary-source confirmed — a live sandbox
 * call against real keys is still the real test.
 *
 * Every Thawani-specific assumption is isolated in the small private
 * methods below (buildCheckoutSessionPayload, extractSessionId,
 * buildHostedCheckoutUrl, extractPaymentStatus) and in config/thawani.php
 * — nothing else in the codebase hardcodes a URL or field name — so this
 * is the one place to correct if a live sandbox response ever disagrees.
 */
class ThawaniService implements ThawaniGateway
{
    private string $baseUrl;

    private string $secretKey;

    private string $publishableKey;

    public function __construct(?string $baseUrl = null, ?string $secretKey = null, ?string $publishableKey = null)
    {
        $this->baseUrl = rtrim($baseUrl ?? (string) config('thawani.base_url'), '/');
        $this->secretKey = $secretKey ?? (string) config('thawani.secret_key');
        $this->publishableKey = $publishableKey ?? (string) config('thawani.publishable_key');
    }

    /**
     * @return array{session_id: string, checkout_url: string}
     */
    public function createCheckoutSession(
        string $clientReferenceId,
        int $amountBaisa,
        string $successUrl,
        string $cancelUrl,
    ): array {
        $response = Http::withHeaders(['thawani-api-key' => $this->secretKey])
            ->baseUrl($this->baseUrl)
            ->post('/checkout/session', $this->buildCheckoutSessionPayload(
                $clientReferenceId,
                $amountBaisa,
                $successUrl,
                $cancelUrl,
            ));

        if ($response->failed()) {
            throw new RuntimeException('Thawani checkout session creation failed.');
        }

        $sessionId = $this->extractSessionId($response->json());

        return [
            'session_id' => $sessionId,
            'checkout_url' => $this->buildHostedCheckoutUrl($sessionId),
        ];
    }

    /**
     * @return array{session_id: string, payment_status: string, raw: array}
     */
    public function retrieveSession(string $sessionId): array
    {
        $response = Http::withHeaders(['thawani-api-key' => $this->secretKey])
            ->baseUrl($this->baseUrl)
            ->get("/checkout/session/{$sessionId}");

        if ($response->failed()) {
            throw new RuntimeException('Unable to retrieve Thawani checkout session.');
        }

        $body = $response->json() ?? [];

        return [
            'session_id' => $sessionId,
            'payment_status' => $this->extractPaymentStatus($body),
            'raw' => $body,
        ];
    }

    // --- Thawani-specific field mapping (unverified — see class docblock) ---

    private function buildCheckoutSessionPayload(
        string $clientReferenceId,
        int $amountBaisa,
        string $successUrl,
        string $cancelUrl,
    ): array {
        return [
            'client_reference_id' => $clientReferenceId,
            'mode' => 'payment',
            'products' => [[
                'name' => 'Padel court booking',
                'quantity' => 1,
                'unit_amount' => $amountBaisa,
            ]],
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
        ];
    }

    private function extractSessionId(?array $body): string
    {
        $sessionId = $body['data']['session_id'] ?? $body['session_id'] ?? null;

        if (! is_string($sessionId) || $sessionId === '') {
            throw new RuntimeException('Thawani response did not include a session id.');
        }

        return $sessionId;
    }

    private function buildHostedCheckoutUrl(string $sessionId): string
    {
        $checkoutBase = rtrim((string) config('thawani.checkout_url'), '/');

        return "{$checkoutBase}/{$sessionId}?key={$this->publishableKey}";
    }

    private function extractPaymentStatus(array $body): string
    {
        return $body['data']['payment_status'] ?? $body['payment_status'] ?? 'unknown';
    }
}
