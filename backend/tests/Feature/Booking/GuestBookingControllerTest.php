<?php

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GuestBookingControllerTest extends TestCase
{
    use RefreshDatabase;

    private function payAtVenueBooking(array $bookingOverrides = []): Booking
    {
        return $this->bookingWith(array_merge([
            'status' => 'confirmed',
            'payment_method' => 'pay_at_venue',
        ], $bookingOverrides), ['status' => 'confirmed'], ['method' => 'pay_at_venue', 'status' => 'pending']);
    }

    private function pendingThawaniBooking(array $bookingOverrides = []): Booking
    {
        return $this->bookingWith(array_merge([
            'status' => 'pending_payment',
            'payment_method' => 'thawani',
            'hold_expires_at' => now()->addMinutes(10),
        ], $bookingOverrides), ['status' => 'pending_payment'], ['method' => 'thawani', 'status' => 'pending']);
    }

    private function paidThawaniBooking(array $bookingOverrides = []): Booking
    {
        return $this->bookingWith(array_merge([
            'status' => 'confirmed',
            'payment_method' => 'thawani',
        ], $bookingOverrides), ['status' => 'confirmed'], ['method' => 'thawani', 'status' => 'paid']);
    }

    private function bookingWith(array $bookingAttrs, array $slotAttrs, array $paymentAttrs): Booking
    {
        $court = Court::factory()->create();
        $booking = Booking::factory()->create($bookingAttrs);
        BookingSlot::factory()->create(array_merge(['booking_id' => $booking->id, 'court_id' => $court->id], $slotAttrs));
        Payment::factory()->create(array_merge(['booking_id' => $booking->id], $paymentAttrs));

        return $booking->fresh(['bookingSlots', 'payments']);
    }

    // --- GET /bookings/{access_token} -----------------------------------

    public function test_valid_guest_lookup_returns_the_booking(): void
    {
        $booking = $this->payAtVenueBooking();

        $response = $this->getJson("/api/bookings/{$booking->access_token}");

        $response->assertOk();
        $response->assertJsonPath('data.booking_reference', $booking->booking_reference);
    }

    public function test_invalid_token_returns_404(): void
    {
        $this->getJson('/api/bookings/not-a-real-token')->assertStatus(404);
    }

    public function test_response_never_exposes_court_identity(): void
    {
        $booking = $this->payAtVenueBooking();

        $response = $this->getJson("/api/bookings/{$booking->access_token}");

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('court_id', $json);
        $this->assertStringNotContainsString('court_name', $json);
        $this->assertStringNotContainsString('court_number', $json);
        $response->assertJsonMissingPath('data.slots.0.court_id');
        $response->assertJsonMissingPath('data.slots.0.court_name');
    }

    // --- POST /bookings/{access_token}/cancel ----------------------------

    public function test_can_cancel_a_future_pay_at_venue_booking(): void
    {
        $booking = $this->payAtVenueBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/cancel");

        $response->assertOk();
        $response->assertJsonPath('data.booking_status', 'cancelled');
        $this->assertSame('cancelled', $booking->fresh()->status->value);
    }

    public function test_can_cancel_a_pending_thawani_booking(): void
    {
        $booking = $this->pendingThawaniBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/cancel");

        $response->assertOk();
        $this->assertSame('cancelled', $booking->fresh()->status->value);
    }

    public function test_cannot_cancel_a_paid_thawani_booking(): void
    {
        $booking = $this->paidThawaniBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/cancel");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'CANCELLATION_NOT_ALLOWED');
        $this->assertSame('confirmed', $booking->fresh()->status->value);
    }

    public function test_cannot_cancel_a_pay_at_venue_booking_that_already_started(): void
    {
        $booking = $this->bookingWith(
            ['status' => 'confirmed', 'payment_method' => 'pay_at_venue'],
            ['status' => 'confirmed', 'date' => now()->toDateString(), 'start_time' => now()->subHour()->format('H:i:s'), 'end_time' => now()->addHour()->format('H:i:s')],
            ['method' => 'pay_at_venue', 'status' => 'pending'],
        );

        $response = $this->postJson("/api/bookings/{$booking->access_token}/cancel");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'CANCELLATION_NOT_ALLOWED');
    }

    public function test_cannot_cancel_an_already_expired_booking(): void
    {
        $booking = $this->bookingWith(
            ['status' => 'expired', 'payment_method' => 'thawani'],
            ['status' => 'expired'],
            ['method' => 'thawani', 'status' => 'failed'],
        );

        $response = $this->postJson("/api/bookings/{$booking->access_token}/cancel");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'BOOKING_ALREADY_RESOLVED');
    }

    public function test_cannot_cancel_an_already_cancelled_booking(): void
    {
        $booking = $this->bookingWith(
            ['status' => 'cancelled', 'payment_method' => 'pay_at_venue'],
            ['status' => 'cancelled'],
            ['method' => 'pay_at_venue', 'status' => 'cancelled'],
        );

        $response = $this->postJson("/api/bookings/{$booking->access_token}/cancel");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'BOOKING_ALREADY_RESOLVED');
    }

    public function test_cancellation_releases_the_booked_slots(): void
    {
        $booking = $this->payAtVenueBooking();
        $slot = $booking->bookingSlots->first();
        $this->assertNotNull($slot->lock_key);

        $this->postJson("/api/bookings/{$booking->access_token}/cancel")->assertOk();

        $this->assertSame('cancelled', $slot->fresh()->status->value);
        $this->assertNull($slot->fresh()->lock_key);
    }

    public function test_cancellation_leaves_the_payment_record_for_audit_instead_of_deleting_it(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();

        $this->postJson("/api/bookings/{$booking->access_token}/cancel")->assertOk();

        $this->assertDatabaseHas('payments', ['id' => $payment->id]);
        $this->assertSame('cancelled', $payment->fresh()->status->value);
    }

    // --- POST /bookings/{access_token}/retry-payment ----------------------

    public function test_retry_payment_issues_a_new_checkout_session(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['data' => ['session_id' => 'checkout_retry_1']], 200)]);

        $booking = $this->pendingThawaniBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/retry-payment");

        $response->assertOk();
        $response->assertJsonPath('data.payment_status', 'pending');
        $this->assertStringContainsString('checkout_retry_1', $response->json('data.checkout_url'));
    }

    public function test_retry_payment_updates_the_existing_payment_row_without_duplicating_it(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['data' => ['session_id' => 'checkout_retry_2']], 200)]);

        $booking = $this->pendingThawaniBooking();

        $this->postJson("/api/bookings/{$booking->access_token}/retry-payment")->assertOk();

        $this->assertSame(1, $booking->payments()->count());
        $this->assertSame('checkout_retry_2', $booking->payments()->latest('id')->first()->thawani_session_id);
    }

    public function test_retry_payment_is_rejected_for_pay_at_venue_bookings(): void
    {
        $booking = $this->payAtVenueBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/retry-payment");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'RETRY_NOT_ALLOWED');
    }

    public function test_retry_payment_is_rejected_for_already_confirmed_thawani_bookings(): void
    {
        $booking = $this->paidThawaniBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/retry-payment");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'RETRY_NOT_ALLOWED');
    }

    public function test_retry_payment_is_rejected_after_the_hold_has_expired(): void
    {
        $booking = $this->pendingThawaniBooking(['hold_expires_at' => now()->subMinute()]);

        $response = $this->postJson("/api/bookings/{$booking->access_token}/retry-payment");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'PAYMENT_HOLD_EXPIRED');
    }

    public function test_retry_payment_returns_a_safe_retryable_error_when_thawani_is_unreachable(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['error' => 'down'], 500)]);

        $booking = $this->pendingThawaniBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/retry-payment");

        $response->assertStatus(502);
        $response->assertJsonPath('error_code', 'THAWANI_UNAVAILABLE');
        $json = json_encode($response->json());
        $this->assertStringNotContainsString('Exception', $json);
    }

    // --- POST /bookings/{access_token}/refresh-payment ---------------------

    public function test_refresh_payment_confirms_a_verified_paid_session(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_refresh_paid';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_refresh_paid' => Http::response(['data' => ['payment_status' => 'paid']], 200),
        ]);

        $response = $this->postJson("/api/bookings/{$booking->access_token}/refresh-payment");

        $response->assertOk();
        $response->assertJsonPath('data.booking_status', 'confirmed');
        $response->assertJsonPath('data.payment_status', 'paid');
    }

    public function test_refresh_payment_handles_a_verified_failed_session(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_refresh_failed';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_refresh_failed' => Http::response(['data' => ['payment_status' => 'failed']], 200),
        ]);

        $response = $this->postJson("/api/bookings/{$booking->access_token}/refresh-payment");

        $response->assertOk();
        $response->assertJsonPath('data.booking_status', 'expired');
        $response->assertJsonPath('data.payment_status', 'failed');
    }

    public function test_refresh_payment_with_unknown_external_status_causes_no_mutation(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_refresh_unknown';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_refresh_unknown' => Http::response(['data' => ['payment_status' => 'awaiting_something']], 200),
        ]);

        $response = $this->postJson("/api/bookings/{$booking->access_token}/refresh-payment");

        $response->assertOk();
        $response->assertJsonPath('data.booking_status', 'pending_payment');
        $this->assertSame('pending_payment', $booking->fresh()->status->value);
        $this->assertSame('pending', $payment->fresh()->status->value);
    }

    public function test_refresh_payment_returns_a_safe_retryable_error_when_thawani_is_unreachable(): void
    {
        $booking = $this->pendingThawaniBooking();
        $payment = $booking->payments->first();
        $payment->thawani_session_id = 'checkout_refresh_down';
        $payment->save();

        Http::fake([
            '*/checkout/session/checkout_refresh_down' => Http::response(['error' => 'down'], 500),
        ]);

        $response = $this->postJson("/api/bookings/{$booking->access_token}/refresh-payment");

        $response->assertStatus(502);
        $response->assertJsonPath('error_code', 'THAWANI_UNAVAILABLE');
    }

    public function test_refresh_payment_is_a_no_op_for_pay_at_venue_bookings(): void
    {
        $booking = $this->payAtVenueBooking();

        Http::fake(); // nothing should be called

        $response = $this->postJson("/api/bookings/{$booking->access_token}/refresh-payment");

        $response->assertOk();
        Http::assertNothingSent();
    }

    // --- access_token exposure (Step 12 amendment) --------------------------
    // access_token is a one-time credential returned only by booking
    // creation (see BookingControllerTest::test_access_token_is_unique_...);
    // every guest self-service endpoint must omit it, since the caller
    // already had to supply it to reach these routes at all.

    public function test_guest_lookup_does_not_return_the_access_token(): void
    {
        $booking = $this->payAtVenueBooking();

        $response = $this->getJson("/api/bookings/{$booking->access_token}");

        $response->assertJsonMissingPath('data.access_token');
    }

    public function test_cancel_response_does_not_return_the_access_token(): void
    {
        $booking = $this->payAtVenueBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/cancel");

        $response->assertJsonMissingPath('data.access_token');
    }

    public function test_retry_payment_response_does_not_return_the_access_token(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['data' => ['session_id' => 'checkout_no_token_leak']], 200)]);

        $booking = $this->pendingThawaniBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/retry-payment");

        $response->assertJsonMissingPath('data.access_token');
    }

    public function test_refresh_payment_response_does_not_return_the_access_token(): void
    {
        $booking = $this->payAtVenueBooking();

        $response = $this->postJson("/api/bookings/{$booking->access_token}/refresh-payment");

        $response->assertJsonMissingPath('data.access_token');
    }

    // --- Court privacy across every guest endpoint (Step 12 amendment) ------
    // None of the fixtures below are both booking_status=confirmed and
    // payment_status=paid, so "never" holds for all of them. The one
    // deliberate exception (confirmed + paid exposes court_name) is
    // covered separately below.

    public function test_no_guest_response_leaks_court_information(): void
    {
        Http::fake(['*/checkout/session' => Http::response(['data' => ['session_id' => 'checkout_privacy_check']], 200)]);

        $lookup = $this->getJson('/api/bookings/'.$this->payAtVenueBooking()->access_token);
        $cancel = $this->postJson('/api/bookings/'.$this->payAtVenueBooking()->access_token.'/cancel');
        $retry = $this->postJson('/api/bookings/'.$this->pendingThawaniBooking()->access_token.'/retry-payment');
        $refresh = $this->postJson('/api/bookings/'.$this->payAtVenueBooking()->access_token.'/refresh-payment');

        foreach ([$lookup, $cancel, $retry, $refresh] as $response) {
            $json = json_encode($response->json());
            $this->assertStringNotContainsString('court', $json);
        }
    }

    // --- Court name exception: confirmed + paid only -------------------

    public function test_confirmed_and_paid_thawani_booking_exposes_the_court_name(): void
    {
        $booking = $this->paidThawaniBooking();
        $court = $booking->bookingSlots->first()->court;

        $response = $this->getJson("/api/bookings/{$booking->access_token}");

        $response->assertOk();
        $response->assertJsonPath('data.slots.0.court_name', $court->name);
        $json = json_encode($response->json());
        $this->assertStringNotContainsString('court_id', $json);
    }

    public function test_confirmed_pay_at_venue_booking_only_exposes_the_court_name_once_marked_paid(): void
    {
        $pending = $this->payAtVenueBooking();
        $pendingResponse = $this->getJson("/api/bookings/{$pending->access_token}");
        $pendingResponse->assertJsonMissingPath('data.slots.0.court_name');

        $paid = $this->bookingWith(
            ['status' => 'confirmed', 'payment_method' => 'pay_at_venue'],
            ['status' => 'confirmed'],
            ['method' => 'pay_at_venue', 'status' => 'paid'],
        );
        $court = $paid->bookingSlots->first()->court;

        $paidResponse = $this->getJson("/api/bookings/{$paid->access_token}");
        $paidResponse->assertJsonPath('data.slots.0.court_name', $court->name);
    }

    // --- Rate limiting -----------------------------------------------------

    public function test_guest_booking_endpoints_are_rate_limited(): void
    {
        $booking = $this->payAtVenueBooking();

        for ($i = 0; $i < 60; $i++) {
            $this->getJson("/api/bookings/{$booking->access_token}")->assertOk();
        }

        $this->getJson("/api/bookings/{$booking->access_token}")->assertStatus(429);
    }
}
