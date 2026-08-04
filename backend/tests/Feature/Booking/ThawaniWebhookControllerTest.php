<?php

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ThawaniWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_confirms_a_booking_on_verified_payment(): void
    {
        $booking = Booking::factory()->create(['status' => 'pending_payment', 'payment_method' => 'thawani']);
        BookingSlot::factory()->create(['booking_id' => $booking->id, 'status' => 'pending_payment']);
        $payment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'method' => 'thawani',
            'status' => 'pending',
        ]);
        $payment->thawani_session_id = 'checkout_webhook_1';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_webhook_1' => Http::response(['data' => ['payment_status' => 'paid']], 200),
        ]);

        $response = $this->postJson('/api/webhooks/thawani', ['data' => ['session_id' => 'checkout_webhook_1']]);

        $response->assertOk();
        $this->assertSame('confirmed', $booking->fresh()->status->value);
    }

    public function test_webhook_always_returns_200_even_for_garbage_payloads(): void
    {
        $response = $this->postJson('/api/webhooks/thawani', ['whatever' => 'garbage', 'nested' => ['x' => 1]]);

        $response->assertOk();
    }

    public function test_webhook_endpoint_requires_no_authentication(): void
    {
        // No Sanctum session, no admin token — Thawani calls this server-to-server.
        $response = $this->postJson('/api/webhooks/thawani', []);

        $response->assertOk();
        $this->assertNotSame(401, $response->getStatusCode());
    }

    public function test_webhook_never_returns_a_raw_server_error_even_if_verification_throws(): void
    {
        $booking = Booking::factory()->create(['status' => 'pending_payment', 'payment_method' => 'thawani']);
        Payment::factory()->create([
            'booking_id' => $booking->id,
            'method' => 'thawani',
            'status' => 'pending',
        ]);
        Payment::where('booking_id', $booking->id)->update(['thawani_session_id' => 'checkout_will_error']);

        Http::fake(['*/checkout/session/checkout_will_error' => Http::response(['error' => 'boom'], 500)]);

        $response = $this->postJson('/api/webhooks/thawani', ['data' => ['session_id' => 'checkout_will_error']]);

        $response->assertOk();
    }
}
