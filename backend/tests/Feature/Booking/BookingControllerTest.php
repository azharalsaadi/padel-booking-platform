<?php

namespace Tests\Feature\Booking;

use App\Exceptions\Booking\SlotConflictException;
use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\CourtWorkingHour;
use App\Models\Payment;
use App\Models\PricingRule;
use App\Services\BookingAllocationService;
use App\Services\BookingCreationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class BookingControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 10000, 'is_active' => true]);
        PricingRule::factory()->create(['hours_from' => 2, 'hours_to' => 2, 'price_per_hour_baisa' => 8000, 'is_active' => true]);
        PricingRule::factory()->create(['hours_from' => 3, 'hours_to' => null, 'price_per_hour_baisa' => 7000, 'is_active' => true]);
    }

    /**
     * Never hit the real Thawani sandbox from tests. Note: Laravel's
     * Http::fake() honors the FIRST matching registered stub, not the
     * last — so this must be called explicitly per test that needs
     * specific Thawani behavior, not once globally in setUp().
     */
    private function fakeThawaniCheckoutSession(int $status = 200): void
    {
        Http::fake([
            '*/checkout/session' => $status === 200
                ? Http::response(['data' => ['session_id' => 'checkout_test_session_123']], 200)
                : Http::response(['error' => 'server error'], $status),
        ]);
    }

    private function futureDate(int $days = 5): string
    {
        return now()->addDays($days)->toDateString();
    }

    private function makeCourt(string $date, string $open = '16:00:00', string $close = '23:00:00'): Court
    {
        $court = Court::factory()->create(['is_active' => true]);

        CourtWorkingHour::factory()->create([
            'court_id' => $court->id,
            'day_of_week' => Carbon::parse($date)->dayOfWeek,
            'open_time' => $open,
            'close_time' => $close,
        ]);

        return $court;
    }

    private function payload(array $overrides = []): array
    {
        $date = $overrides['date'] ?? $this->futureDate();

        return array_merge([
            'customer_phone' => '+96891234567',
            'customer_name' => 'Ahmed Al Balushi',
            'customer_email' => null,
            'notes' => null,
            'payment_method' => 'pay_at_venue',
            'slots' => [
                ['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00'],
            ],
        ], $overrides);
    }

    // --- Success paths -----------------------------------------------

    public function test_pay_at_venue_creates_a_confirmed_booking_with_a_pending_payment(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', $this->payload(['date' => $date, 'payment_method' => 'pay_at_venue']));

        $response->assertCreated();
        $response->assertJsonPath('data.booking_status', 'confirmed');
        $response->assertJsonPath('data.payment_method', 'pay_at_venue');
        $response->assertJsonPath('data.payment_status', 'pending');
        // Locked contract: checkout_url/hold_expires_at must not appear at
        // all for pay_at_venue, not even as null.
        $this->assertArrayNotHasKey('checkout_url', $response->json('data'));
        $this->assertArrayNotHasKey('hold_expires_at', $response->json('data'));

        $booking = Booking::first();
        $this->assertSame('confirmed', $booking->status->value);
        $this->assertNull($booking->hold_expires_at);
        $this->assertNotNull($booking->confirmed_at);

        $payment = Payment::first();
        $this->assertSame('pay_at_venue', $payment->method->value);
        $this->assertSame('pending', $payment->status->value);
        $this->assertNull($payment->thawani_session_id, 'no checkout session should ever be created for pay_at_venue');
    }

    public function test_thawani_creates_a_pending_payment_booking_with_a_hold_expiry_and_pending_payment(): void
    {
        $this->fakeThawaniCheckoutSession();

        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', $this->payload(['date' => $date, 'payment_method' => 'thawani']));

        $response->assertCreated();
        $response->assertJsonPath('data.booking_status', 'pending_payment');
        $response->assertJsonPath('data.payment_method', 'thawani');
        $response->assertJsonPath('data.payment_status', 'pending');
        $this->assertNotNull($response->json('data.checkout_url'));
        $this->assertStringContainsString('checkout_test_session_123', $response->json('data.checkout_url'));
        $this->assertNotNull($response->json('data.hold_expires_at'));

        $booking = Booking::first();
        $this->assertSame('pending_payment', $booking->status->value);
        $this->assertNotNull($booking->hold_expires_at);
        $this->assertTrue($booking->hold_expires_at->isFuture());
        $this->assertNull($booking->confirmed_at);

        $payment = Payment::first();
        $this->assertSame('thawani', $payment->method->value);
        $this->assertSame('pending', $payment->status->value);
        $this->assertSame('checkout_test_session_123', $payment->thawani_session_id);
    }

    public function test_pay_at_venue_booking_has_no_checkout_url_or_hold_expiry(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', $this->payload(['date' => $date, 'payment_method' => 'pay_at_venue']));

        $response->assertCreated();
        $this->assertArrayNotHasKey('checkout_url', $response->json('data'));
        $this->assertArrayNotHasKey('hold_expires_at', $response->json('data'));
    }

    public function test_booking_still_succeeds_if_thawani_session_creation_fails(): void
    {
        $this->fakeThawaniCheckoutSession(500);

        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', $this->payload(['date' => $date, 'payment_method' => 'thawani']));

        // Booking creation itself is resilient to the gateway being down —
        // the checkout_url key is still present (payment_method is
        // thawani) but null, since no session could be created yet.
        $response->assertCreated();
        $response->assertJsonPath('data.booking_status', 'pending_payment');
        $this->assertArrayHasKey('checkout_url', $response->json('data'));
        $this->assertNull($response->json('data.checkout_url'));
        $this->assertSame(1, Booking::count());
    }

    public function test_price_is_recalculated_during_booking_not_trusted_from_any_earlier_quote(): void
    {
        $date1 = $this->futureDate(5);
        $date2 = $this->futureDate(6);
        $this->makeCourt($date1);
        $this->makeCourt($date2);

        $response = $this->postJson('/api/bookings', $this->payload([
            'slots' => [
                ['date' => $date1, 'start_time' => '18:00', 'end_time' => '19:00'],
                ['date' => $date2, 'start_time' => '20:00', 'end_time' => '21:00'],
            ],
        ]));

        $response->assertCreated();
        // 2 total hours across 2 dates -> the 2-hour tier (8000/hr) = 16000.
        $response->assertJsonPath('data.total_price_baisa', 16000);
        $this->assertSame(16000, Booking::first()->total_price_baisa);
    }

    public function test_every_booking_slot_stores_the_correct_applied_per_hour_price(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $this->postJson('/api/bookings', $this->payload([
            'slots' => [
                ['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00'],
                ['date' => $date, 'start_time' => '19:00', 'end_time' => '20:00'],
            ],
        ]))->assertCreated();

        foreach (BookingSlot::all() as $slot) {
            $this->assertSame(8000, $slot->price_baisa); // 2-hour tier applies uniformly
        }
    }

    public function test_customer_name_and_email_are_optional(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', $this->payload([
            'date' => $date,
            'customer_name' => null,
            'customer_email' => null,
        ]));

        $response->assertCreated();
        $this->assertNull(Booking::first()->customer_name);
        $this->assertNull(Booking::first()->customer_email);
    }

    /**
     * Step 18 (Testing) — a live HTTP smoke check against a running dev
     * server (not PHPUnit, whose JSON test payloads always went through
     * payload(), which explicitly sets every optional key) sent a request
     * omitting customer_name/customer_email/notes entirely, rather than
     * as explicit null. Since those fields are validated as 'nullable'
     * not 'required', validated() omits an absent key instead of filling
     * it with null, and BookingCreationService::persistBooking() read it
     * via raw array access — a genuine 500. Fixed with ?? null there.
     */
    public function test_omitting_optional_customer_fields_entirely_still_succeeds(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', [
            'customer_phone' => '+96891234567',
            'payment_method' => 'pay_at_venue',
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
        ]);

        $response->assertCreated();
        $this->assertNull(Booking::first()->customer_name);
        $this->assertNull(Booking::first()->customer_email);
        $this->assertNull(Booking::first()->notes);
    }

    public function test_multi_hour_booking_in_a_single_booking_succeeds(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', $this->payload([
            'slots' => [
                ['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00'],
                ['date' => $date, 'start_time' => '19:00', 'end_time' => '20:00'],
                ['date' => $date, 'start_time' => '20:00', 'end_time' => '21:00'],
            ],
        ]));

        $response->assertCreated();
        $response->assertJsonPath('data.total_hours', 3);
        $this->assertSame(3, BookingSlot::count());
        $this->assertSame(1, Booking::count());
    }

    public function test_multi_day_booking_in_a_single_booking_succeeds(): void
    {
        $date1 = $this->futureDate(5);
        $date2 = $this->futureDate(12);
        $this->makeCourt($date1);
        $this->makeCourt($date2);

        $response = $this->postJson('/api/bookings', $this->payload([
            'slots' => [
                ['date' => $date1, 'start_time' => '18:00', 'end_time' => '19:00'],
                ['date' => $date2, 'start_time' => '19:00', 'end_time' => '20:00'],
            ],
        ]));

        $response->assertCreated();
        $response->assertJsonPath('data.total_hours', 2);
        $this->assertSame(1, Booking::count());
        $this->assertSame(2, BookingSlot::query()->distinct()->count('date'));
    }

    public function test_all_money_values_are_integer_baisa(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $this->postJson('/api/bookings', $this->payload(['date' => $date]))->assertCreated();

        $this->assertIsInt(Booking::first()->total_price_baisa);
        $this->assertIsInt(BookingSlot::first()->price_baisa);
        $this->assertIsInt(Payment::first()->amount_baisa);
    }

    // --- Reference / token ------------------------------------------

    public function test_booking_reference_has_the_documented_format_and_is_unique(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date); // 2 courts so both bookings can be satisfied

        $r1 = $this->postJson('/api/bookings', $this->payload(['date' => $date, 'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']]]));
        $r2 = $this->postJson('/api/bookings', $this->payload(['date' => $date, 'slots' => [['date' => $date, 'start_time' => '19:00', 'end_time' => '20:00']]]));

        $r1->assertCreated();
        $r2->assertCreated();

        $ref1 = $r1->json('data.booking_reference');
        $ref2 = $r2->json('data.booking_reference');

        $this->assertMatchesRegularExpression('/^BK-\d{8}-\d{6}$/', $ref1);
        $this->assertMatchesRegularExpression('/^BK-\d{8}-\d{6}$/', $ref2);
        $this->assertNotSame($ref1, $ref2);
        $this->assertSame(2, Booking::distinct()->count('booking_reference'));
    }

    public function test_access_token_is_unique_and_not_derived_from_booking_data(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date);

        $r1 = $this->postJson('/api/bookings', $this->payload(['slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']]]));
        $r2 = $this->postJson('/api/bookings', $this->payload(['slots' => [['date' => $date, 'start_time' => '19:00', 'end_time' => '20:00']]]));

        $token1 = $r1->json('data.access_token');
        $token2 = $r2->json('data.access_token');

        $this->assertNotSame($token1, $token2);
        $this->assertGreaterThanOrEqual(64, strlen($token1));

        $booking1 = Booking::where('access_token', $token1)->first();
        $this->assertStringNotContainsString($booking1->booking_reference, $token1);
        $this->assertStringNotContainsString('96891234567', $token1);
    }

    // --- Validation ---------------------------------------------------

    public function test_invalid_phone_is_rejected(): void
    {
        $response = $this->postJson('/api/bookings', $this->payload(['customer_phone' => '12345']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('customer_phone');
    }

    public function test_invalid_email_is_rejected(): void
    {
        $response = $this->postJson('/api/bookings', $this->payload(['customer_email' => 'not-an-email']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('customer_email');
    }

    public function test_notes_exceeding_max_length_is_rejected(): void
    {
        $response = $this->postJson('/api/bookings', $this->payload(['notes' => str_repeat('a', 1001)]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('notes');
    }

    public function test_invalid_payment_method_is_rejected(): void
    {
        $response = $this->postJson('/api/bookings', $this->payload(['payment_method' => 'credit_card']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('payment_method');
    }

    // --- Trust boundary -------------------------------------------------

    public function test_frontend_supplied_court_status_and_price_fields_are_ignored(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', array_merge($this->payload(['date' => $date]), [
            'court_id' => 999,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'total_hours' => 99,
            'total_price' => 1,
            'total_price_baisa' => 1,
            'slot_price' => 1,
            'booking_reference' => 'BK-HACKED-000001',
            'access_token' => 'hacked-token-value',
        ]));

        $response->assertCreated();
        $this->assertSame(10000, $response->json('data.total_price_baisa'));
        $this->assertNotSame('BK-HACKED-000001', $response->json('data.booking_reference'));
        $this->assertNotSame('hacked-token-value', $response->json('data.access_token'));
    }

    // --- Customer privacy -----------------------------------------------

    public function test_response_contains_no_court_information(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', $this->payload(['date' => $date]));

        $response->assertCreated();
        $this->assertStringNotContainsString('court', strtolower($response->getContent()));
    }

    // --- Availability / rollback -----------------------------------------

    public function test_unavailable_slot_causes_a_409_and_creates_no_rows(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        BookingSlot::factory()->create([
            'booking_id' => Booking::factory()->create(['status' => 'confirmed'])->id,
            'court_id' => $court->id,
            'date' => $date,
            'start_time' => '18:00:00',
            'end_time' => '19:00:00',
            'status' => 'confirmed',
        ]);
        $bookingCountBefore = Booking::count();

        $response = $this->postJson('/api/bookings', $this->payload(['date' => $date]));

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'SLOT_UNAVAILABLE');
        $this->assertStringNotContainsString('court', strtolower($response->getContent()));
        $this->assertSame($bookingCountBefore, Booking::count());
        $this->assertSame(0, Payment::count());
    }

    public function test_missing_pricing_rule_creates_no_rows(): void
    {
        PricingRule::query()->delete();
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', $this->payload(['date' => $date]));

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'NO_MATCHING_PRICING_RULE');
        $this->assertSame(0, Booking::count());
        $this->assertSame(0, BookingSlot::count());
        $this->assertSame(0, Payment::count());
    }

    public function test_second_booking_for_an_already_taken_slot_is_rejected_and_creates_no_rows(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date); // exactly one active court

        $first = $this->postJson('/api/bookings', $this->payload(['date' => $date]));
        $first->assertCreated();

        $second = $this->postJson('/api/bookings', $this->payload(['date' => $date]));

        $second->assertStatus(409);
        $second->assertJsonPath('error_code', 'SLOT_UNAVAILABLE');
        $this->assertSame(1, Booking::count());
        $this->assertSame(1, BookingSlot::count());
        $this->assertSame(1, Payment::count());
    }

    /**
     * True multi-connection concurrent-locking tests are not practical
     * under RefreshDatabase: each test runs inside one uncommitted
     * transaction, so a second, independent DB connection can never see
     * the seeded court/data in the first place (transaction isolation
     * hides uncommitted rows from other sessions). What IS practically
     * testable, and is the behavior that actually matters, is: if the
     * database-level lock_key backstop is ever hit — e.g. app-level
     * locking missed a genuine race — BookingCreationService must catch
     * it cleanly and roll back completely, not leak a raw SQL error or a
     * partial booking. This simulates that by faking the allocator to
     * report an already-taken slot as free.
     */
    public function test_lock_key_unique_constraint_is_the_final_backstop_when_allocation_is_bypassed(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        BookingSlot::factory()->create([
            'booking_id' => Booking::factory()->create(['status' => 'confirmed'])->id,
            'court_id' => $court->id,
            'date' => $date,
            'start_time' => '18:00:00',
            'end_time' => '19:00:00',
            'status' => 'confirmed',
        ]);

        $fakeAllocator = Mockery::mock(BookingAllocationService::class);
        $fakeAllocator->shouldReceive('allocate')->andReturn([
            ['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00', 'court_id' => $court->id],
        ]);
        $this->app->instance(BookingAllocationService::class, $fakeAllocator);

        $service = $this->app->make(BookingCreationService::class);

        $bookingCountBefore = Booking::count();

        try {
            $service->create([
                'customer_phone' => '+96891234567',
                'customer_name' => null,
                'customer_email' => null,
                'notes' => null,
                'payment_method' => 'pay_at_venue',
                'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
            ]);
            $this->fail('Expected SlotConflictException.');
        } catch (SlotConflictException $e) {
            $this->assertSame('SLOT_UNAVAILABLE', $e->render(request())->getData(true)['error_code']);
        }

        // Full rollback: only the pre-existing slot exists, nothing new.
        $this->assertSame($bookingCountBefore, Booking::count());
        $this->assertSame(1, BookingSlot::count());
        $this->assertSame(0, Payment::count());
    }

    /**
     * Step 17 hardening: a real Thawani booking holds a court slot for
     * THAWANI_HOLD_MINUTES, so unauthenticated scripted booking creation
     * is a real availability-degradation vector, not just a data concern
     * — now rate limited. The throttle middleware runs before validation,
     * so an otherwise-invalid payload is enough to prove the limit exists
     * without needing 20 distinct real slots.
     */
    public function test_booking_creation_is_rate_limited(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/bookings', [])->assertStatus(422);
        }

        $this->postJson('/api/bookings', [])->assertStatus(429);
    }
}
