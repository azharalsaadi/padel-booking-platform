<?php

namespace Tests\Unit\Services;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): PaymentService
    {
        return $this->app->make(PaymentService::class);
    }

    private function pendingThawaniBooking(): Booking
    {
        $booking = Booking::factory()->create([
            'status' => 'pending_payment',
            'payment_method' => 'thawani',
            'hold_expires_at' => now()->addMinutes(10),
        ]);

        BookingSlot::factory()->create([
            'booking_id' => $booking->id,
            'status' => 'pending_payment',
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'method' => 'thawani',
            'status' => 'pending',
        ]);

        return $booking->fresh(['bookingSlots', 'payments']);
    }

    // --- issueCheckoutSession ------------------------------------------

    public function test_issue_checkout_session_stores_the_session_id_and_checkout_url(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['data' => ['session_id' => 'checkout_xyz']], 200)]);

        $booking = $this->pendingThawaniBooking();

        $payment = $this->service()->issueCheckoutSession($booking);

        $this->assertSame('checkout_xyz', $payment->thawani_session_id);
        $this->assertStringContainsString('checkout_xyz', $payment->checkout_url);
    }

    public function test_issue_checkout_session_does_not_throw_when_thawani_is_unreachable(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['error' => 'down'], 500)]);

        $booking = $this->pendingThawaniBooking();

        $payment = $this->service()->issueCheckoutSession($booking);

        $this->assertNull($payment->thawani_session_id);
        $this->assertNull($payment->checkout_url);
        // Booking is untouched — still pending_payment, ready for a retry.
        $this->assertSame('pending_payment', $booking->fresh()->status->value);
    }

    // --- handleWebhookEvent: paid ----------------------------------------

    public function test_webhook_with_verified_paid_status_confirms_the_booking(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_paid_1';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_paid_1' => Http::response(['data' => ['payment_status' => 'paid']], 200),
        ]);

        $this->service()->handleWebhookEvent(['data' => ['session_id' => 'checkout_paid_1']]);

        $booking->refresh();
        $payment->refresh();

        $this->assertSame('confirmed', $booking->status->value);
        $this->assertNotNull($booking->confirmed_at);
        $this->assertSame('paid', $payment->status->value);
        $this->assertNotNull($payment->paid_at);
        $this->assertTrue($booking->bookingSlots->every(fn ($slot) => $slot->status->value === 'confirmed'));
    }

    public function test_webhook_is_idempotent_for_duplicate_deliveries(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_dup_1';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_dup_1' => Http::response(['data' => ['payment_status' => 'paid']], 200),
        ]);

        $this->service()->handleWebhookEvent(['data' => ['session_id' => 'checkout_dup_1']]);
        $this->service()->handleWebhookEvent(['data' => ['session_id' => 'checkout_dup_1']]);

        $this->assertSame(1, DB::table('webhook_events')->count());
        // retrieveSession should only have been called once too (2nd delivery short-circuits).
        Http::assertSentCount(1);
    }

    // --- handleWebhookEvent: failed --------------------------------------

    public function test_webhook_with_verified_failed_status_expires_the_booking_and_frees_slots(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_failed_1';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_failed_1' => Http::response(['data' => ['payment_status' => 'failed']], 200),
        ]);

        $this->service()->handleWebhookEvent(['data' => ['session_id' => 'checkout_failed_1']]);

        $booking->refresh();
        $payment->refresh();

        $this->assertSame('expired', $booking->status->value);
        $this->assertSame('failed', $payment->status->value);
        $this->assertNotNull($payment->failed_at);
        $this->assertTrue($booking->bookingSlots->every(fn ($slot) => $slot->status->value === 'expired'));

        // lock_key is generated from status — expired means it's NULL, freeing the slot.
        $slot = $booking->bookingSlots->first();
        $this->assertNull($slot->fresh()->lock_key);
    }

    // --- handleWebhookEvent: no-op paths --------------------------------

    public function test_webhook_for_an_unknown_session_id_is_a_safe_no_op(): void
    {
        Http::fake(); // nothing should even be called

        $this->service()->handleWebhookEvent(['data' => ['session_id' => 'checkout_never_seen']]);

        Http::assertNothingSent();
        $this->assertSame(1, DB::table('webhook_events')->count());
    }

    public function test_webhook_with_no_usable_identifier_is_logged_but_does_nothing(): void
    {
        $this->service()->handleWebhookEvent(['some' => 'garbage']);

        $this->assertSame(1, DB::table('webhook_events')->count());
        $this->assertSame(0, Booking::count());
    }

    public function test_already_confirmed_booking_is_not_reprocessed_by_a_late_webhook(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_already_confirmed';
        $payment->save();

        // Simulate already resolved (e.g. by the expiry job or an earlier webhook).
        $payment->status = 'paid';
        $payment->save();
        $booking->status = 'confirmed';
        $booking->save();

        Http::fake([
            '*/checkout/session/checkout_already_confirmed' => Http::response(['data' => ['payment_status' => 'failed']], 200),
        ]);

        $this->service()->handleWebhookEvent(['data' => ['session_id' => 'checkout_already_confirmed']]);

        // Must NOT flip back to failed/expired — already-resolved state is final.
        $this->assertSame('confirmed', $booking->fresh()->status->value);
        $this->assertSame('paid', $payment->fresh()->status->value);
    }

    // --- refreshPaymentStatus (Step 12) ----------------------------------

    public function test_refresh_payment_status_applies_a_verified_paid_result(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_refresh_unit_paid';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_refresh_unit_paid' => Http::response(['data' => ['payment_status' => 'paid']], 200),
        ]);

        $refreshed = $this->service()->refreshPaymentStatus($booking);

        $this->assertSame('confirmed', $refreshed->status->value);
        $this->assertSame('paid', $refreshed->payments->first()->status->value);
    }

    public function test_refresh_payment_status_is_a_no_op_when_there_is_no_thawani_session(): void
    {
        $booking = Booking::factory()->create(['status' => 'confirmed', 'payment_method' => 'pay_at_venue']);
        Payment::factory()->create(['booking_id' => $booking->id, 'method' => 'pay_at_venue', 'status' => 'pending']);

        Http::fake();

        $result = $this->service()->refreshPaymentStatus($booking->fresh(['payments']));

        Http::assertNothingSent();
        $this->assertSame('confirmed', $result->status->value);
    }
}
