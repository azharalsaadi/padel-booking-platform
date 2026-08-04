<?php

namespace App\Contracts;

/**
 * Whatever actually talks to (or simulates) Thawani for a checkout
 * session — implemented by the real UAT client (ThawaniService) and by
 * MockThawaniService. PaymentService depends on this, not a concrete
 * class, so the two are interchangeable via container binding
 * (AppServiceProvider) based on config('thawani.mode').
 */
interface ThawaniGateway
{
    /**
     * @return array{session_id: string, checkout_url: string}
     */
    public function createCheckoutSession(
        string $clientReferenceId,
        int $amountBaisa,
        string $successUrl,
        string $cancelUrl,
    ): array;

    /**
     * @return array{session_id: string, payment_status: string, raw: array}
     */
    public function retrieveSession(string $sessionId): array;
}
