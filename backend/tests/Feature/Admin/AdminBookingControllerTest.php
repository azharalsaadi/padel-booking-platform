<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminBookingControllerTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): AdminUser
    {
        return AdminUser::factory()->create();
    }

    private function bookingWithSlot(array $bookingAttrs, array $slotAttrs = [], array $paymentAttrs = []): Booking
    {
        $booking = Booking::factory()->create($bookingAttrs);
        BookingSlot::factory()->create(array_merge(['booking_id' => $booking->id], $slotAttrs));
        Payment::factory()->create(array_merge(['booking_id' => $booking->id], $paymentAttrs));

        return $booking;
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/admin/bookings')->assertStatus(401);
    }

    public function test_index_lists_bookings_with_slots_and_court_names(): void
    {
        $court = Court::factory()->create(['name' => 'Court 1']);
        $this->bookingWithSlot(['status' => 'confirmed'], ['court_id' => $court->id]);

        $response = $this->actingAs($this->admin(), 'admin')->getJson('/api/admin/bookings');

        $response->assertOk();
        $response->assertJsonPath('data.0.slots.0.court_name', 'Court 1');
    }

    public function test_show_returns_full_booking_detail(): void
    {
        $booking = $this->bookingWithSlot(['status' => 'confirmed']);

        $response = $this->actingAs($this->admin(), 'admin')->getJson("/api/admin/bookings/{$booking->id}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $booking->id);
        $response->assertJsonPath('data.booking_reference', $booking->booking_reference);
    }

    // --- The 5 mandatory filters ----------------------------------------

    public function test_filters_by_court(): void
    {
        $courtA = Court::factory()->create();
        $courtB = Court::factory()->create();
        $matching = $this->bookingWithSlot(['status' => 'confirmed'], ['court_id' => $courtA->id]);
        $this->bookingWithSlot(['status' => 'confirmed'], ['court_id' => $courtB->id]);

        $response = $this->actingAs($this->admin(), 'admin')->getJson("/api/admin/bookings?court_id={$courtA->id}");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $matching->id);
    }

    public function test_filters_by_date_range(): void
    {
        $inRange = $this->bookingWithSlot(['status' => 'confirmed'], ['date' => now()->addDays(5)->toDateString()]);
        $this->bookingWithSlot(['status' => 'confirmed'], ['date' => now()->addDays(50)->toDateString()]);

        $response = $this->actingAs($this->admin(), 'admin')->getJson('/api/admin/bookings?'.http_build_query([
            'date_from' => now()->addDays(1)->toDateString(),
            'date_to' => now()->addDays(10)->toDateString(),
        ]));

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $inRange->id);
    }

    public function test_filters_by_status(): void
    {
        $confirmed = $this->bookingWithSlot(['status' => 'confirmed']);
        $this->bookingWithSlot(['status' => 'cancelled']);

        $response = $this->actingAs($this->admin(), 'admin')->getJson('/api/admin/bookings?status=confirmed');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $confirmed->id);
    }

    public function test_filters_by_payment_method(): void
    {
        $thawani = $this->bookingWithSlot(['status' => 'pending_payment', 'payment_method' => 'thawani']);
        $this->bookingWithSlot(['status' => 'confirmed', 'payment_method' => 'pay_at_venue']);

        $response = $this->actingAs($this->admin(), 'admin')->getJson('/api/admin/bookings?payment_method=thawani');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $thawani->id);
    }

    public function test_filters_by_customer_phone(): void
    {
        $match = $this->bookingWithSlot(['status' => 'confirmed', 'customer_phone' => '+96891112222']);
        $this->bookingWithSlot(['status' => 'confirmed', 'customer_phone' => '+96899998888']);

        $response = $this->actingAs($this->admin(), 'admin')->getJson('/api/admin/bookings?phone=91112222');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $match->id);
    }

    public function test_filters_by_booking_reference(): void
    {
        $match = $this->bookingWithSlot(['status' => 'confirmed']);
        $this->bookingWithSlot(['status' => 'confirmed']);

        $reference = $match->booking_reference;
        $response = $this->actingAs($this->admin(), 'admin')->getJson("/api/admin/bookings?reference={$reference}");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $match->id);
    }

    public function test_filters_can_combine(): void
    {
        $court = Court::factory()->create();
        $match = $this->bookingWithSlot(
            ['status' => 'confirmed', 'payment_method' => 'pay_at_venue'],
            ['court_id' => $court->id, 'status' => 'confirmed', 'date' => now()->addDays(5)->toDateString()]
        );
        $this->bookingWithSlot(
            ['status' => 'cancelled', 'payment_method' => 'pay_at_venue'],
            ['court_id' => $court->id, 'status' => 'cancelled', 'date' => now()->addDays(6)->toDateString()]
        );

        $response = $this->actingAs($this->admin(), 'admin')->getJson(
            "/api/admin/bookings?court_id={$court->id}&status=confirmed&payment_method=pay_at_venue"
        );

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $match->id);
    }

    public function test_invalid_status_filter_is_rejected(): void
    {
        $this->actingAs($this->admin(), 'admin')
            ->getJson('/api/admin/bookings?status=not_a_real_status')
            ->assertStatus(422);
    }

    // --- Performance ------------------------------------------------------

    public function test_index_does_not_n_plus_1_across_many_bookings(): void
    {
        // Created up front and reused, so the admin-creation INSERT is
        // never itself counted in either measurement below.
        $admin = $this->admin();

        for ($i = 0; $i < 10; $i++) {
            $this->bookingWithSlot(['status' => 'confirmed']);
        }

        DB::enableQueryLog();
        $this->actingAs($admin, 'admin')->getJson('/api/admin/bookings')->assertOk();
        $countWithTen = count(DB::getQueryLog());
        DB::flushQueryLog();

        for ($i = 0; $i < 10; $i++) {
            $this->bookingWithSlot(['status' => 'confirmed']);
        }
        DB::flushQueryLog(); // discard the setup INSERTs above

        $this->actingAs($admin, 'admin')->getJson('/api/admin/bookings?per_page=50')->assertOk();
        $countWithTwenty = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertSame($countWithTen, $countWithTwenty, 'query count must not grow with the number of bookings returned');
    }

    // --- POST /bookings/{booking}/mark-paid -------------------------------

    public function test_mark_paid_requires_authentication(): void
    {
        $booking = $this->bookingWithSlot(['status' => 'confirmed', 'payment_method' => 'pay_at_venue']);

        $this->postJson("/api/admin/bookings/{$booking->id}/mark-paid")->assertStatus(401);
    }

    public function test_mark_paid_confirms_a_pending_pay_at_venue_payment(): void
    {
        $booking = $this->bookingWithSlot(['status' => 'confirmed', 'payment_method' => 'pay_at_venue']);

        $response = $this->actingAs($this->admin(), 'admin')->postJson("/api/admin/bookings/{$booking->id}/mark-paid");

        $response->assertOk();
        $response->assertJsonPath('data.payment_status', 'paid');
        $response->assertJsonPath('data.booking_status', 'confirmed');
        $this->assertNotNull($response->json('data.paid_at'));

        $payment = Payment::where('booking_id', $booking->id)->first();
        $this->assertSame('paid', $payment->status->value);
        $this->assertNotNull($payment->paid_at);
    }

    public function test_mark_paid_is_rejected_for_thawani_bookings(): void
    {
        $booking = $this->bookingWithSlot(
            ['status' => 'pending_payment', 'payment_method' => 'thawani'],
            [],
            ['method' => 'thawani', 'status' => 'pending'],
        );

        $response = $this->actingAs($this->admin(), 'admin')->postJson("/api/admin/bookings/{$booking->id}/mark-paid");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'MARK_PAID_NOT_ALLOWED');
        $this->assertSame('pending', Payment::where('booking_id', $booking->id)->first()->status->value);
    }

    public function test_mark_paid_is_rejected_for_a_cancelled_booking(): void
    {
        $booking = $this->bookingWithSlot(['status' => 'cancelled', 'payment_method' => 'pay_at_venue']);

        $response = $this->actingAs($this->admin(), 'admin')->postJson("/api/admin/bookings/{$booking->id}/mark-paid");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'MARK_PAID_NOT_ALLOWED');
    }

    public function test_mark_paid_is_rejected_for_an_expired_booking(): void
    {
        $booking = $this->bookingWithSlot(['status' => 'expired', 'payment_method' => 'pay_at_venue']);

        $response = $this->actingAs($this->admin(), 'admin')->postJson("/api/admin/bookings/{$booking->id}/mark-paid");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'MARK_PAID_NOT_ALLOWED');
    }

    public function test_mark_paid_is_rejected_when_the_payment_is_already_paid(): void
    {
        $booking = $this->bookingWithSlot(
            ['status' => 'confirmed', 'payment_method' => 'pay_at_venue'],
            [],
            ['status' => 'paid'],
        );

        $response = $this->actingAs($this->admin(), 'admin')->postJson("/api/admin/bookings/{$booking->id}/mark-paid");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'PAYMENT_ALREADY_RESOLVED');
    }

    public function test_mark_paid_is_rejected_when_the_payment_has_failed(): void
    {
        $booking = $this->bookingWithSlot(
            ['status' => 'confirmed', 'payment_method' => 'pay_at_venue'],
            [],
            ['status' => 'failed'],
        );

        $response = $this->actingAs($this->admin(), 'admin')->postJson("/api/admin/bookings/{$booking->id}/mark-paid");

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'PAYMENT_ALREADY_RESOLVED');
    }
}
