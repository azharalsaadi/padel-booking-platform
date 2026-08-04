<?php

namespace Tests\Unit\Services;

use App\Services\ThawaniService;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class ThawaniServiceTest extends TestCase
{
    private function service(): ThawaniService
    {
        return new ThawaniService(
            baseUrl: 'https://uatcheckout.thawani.om/api/v1',
            secretKey: 'test-secret-key',
            publishableKey: 'test-publishable-key',
        );
    }

    public function test_create_checkout_session_sends_the_api_key_header_and_amount(): void
    {
        Http::fake([
            '*/checkout/session' => Http::response(['data' => ['session_id' => 'checkout_abc123']], 200),
        ]);

        $result = $this->service()->createCheckoutSession(
            clientReferenceId: 'BK-20260810-000001',
            amountBaisa: 16000,
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
        );

        $this->assertSame('checkout_abc123', $result['session_id']);
        $this->assertStringContainsString('checkout_abc123', $result['checkout_url']);
        $this->assertStringContainsString('test-publishable-key', $result['checkout_url']);

        Http::assertSent(function ($request) {
            return $request->hasHeader('thawani-api-key', 'test-secret-key')
                && $request['client_reference_id'] === 'BK-20260810-000001'
                && $request['products'][0]['unit_amount'] === 16000;
        });
    }

    public function test_create_checkout_session_throws_on_a_failed_response(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['error' => 'bad request'], 400)]);

        $this->expectException(RuntimeException::class);

        $this->service()->createCheckoutSession('BK-1', 10000, 'https://x/success', 'https://x/cancel');
    }

    public function test_create_checkout_session_throws_when_response_has_no_session_id(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['data' => []], 200)]);

        $this->expectException(RuntimeException::class);

        $this->service()->createCheckoutSession('BK-1', 10000, 'https://x/success', 'https://x/cancel');
    }

    public function test_retrieve_session_returns_the_payment_status(): void
    {
        Http::fake([
            '*/checkout/session/checkout_abc123' => Http::response(['data' => ['payment_status' => 'paid']], 200),
        ]);

        $result = $this->service()->retrieveSession('checkout_abc123');

        $this->assertSame('checkout_abc123', $result['session_id']);
        $this->assertSame('paid', $result['payment_status']);

        Http::assertSent(fn ($request) => $request->hasHeader('thawani-api-key', 'test-secret-key'));
    }

    public function test_retrieve_session_throws_on_a_failed_response(): void
    {
        Http::fake(['*/checkout/session/*' => Http::response(['error' => 'not found'], 404)]);

        $this->expectException(RuntimeException::class);

        $this->service()->retrieveSession('nonexistent');
    }
}
