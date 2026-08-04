<?php

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\CourtWorkingHour;
use App\Models\Payment;
use App\Models\PricingRule;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingQuoteControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 10000, 'is_active' => true]);
        PricingRule::factory()->create(['hours_from' => 2, 'hours_to' => 2, 'price_per_hour_baisa' => 8000, 'is_active' => true]);
        PricingRule::factory()->create(['hours_from' => 3, 'hours_to' => null, 'price_per_hour_baisa' => 7000, 'is_active' => true]);
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

    // --- Validation --------------------------------------------------

    public function test_slots_are_required(): void
    {
        $response = $this->postJson('/api/bookings/quote', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('slots');
    }

    public function test_slots_must_be_a_non_empty_array(): void
    {
        $response = $this->postJson('/api/bookings/quote', ['slots' => []]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('slots');
    }

    public function test_each_slot_requires_date_start_time_and_end_time(): void
    {
        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $this->futureDate()]],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['slots.0.start_time', 'slots.0.end_time']);
    }

    public function test_end_time_must_be_after_start_time(): void
    {
        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $this->futureDate(), 'start_time' => '19:00', 'end_time' => '18:00']],
        ]);

        $response->assertStatus(422);
    }

    public function test_partial_hour_slot_is_rejected(): void
    {
        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $this->futureDate(), 'start_time' => '18:00', 'end_time' => '18:30']],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('slots.0.end_time');
    }

    public function test_duplicate_slots_are_rejected(): void
    {
        $date = $this->futureDate();

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [
                ['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00'],
                ['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('slots.1');
    }

    public function test_past_slot_is_rejected(): void
    {
        $yesterday = now()->subDay()->toDateString();

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $yesterday, 'start_time' => '18:00', 'end_time' => '19:00']],
        ]);

        $response->assertStatus(422);
    }

    public function test_past_time_today_is_rejected(): void
    {
        $frozenNow = now()->setTime(15, 0, 0);
        Carbon::setTestNow($frozenNow);

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $frozenNow->toDateString(), 'start_time' => '10:00', 'end_time' => '11:00']],
        ]);

        $response->assertStatus(422);

        Carbon::setTestNow();
    }

    // --- Pricing + availability integration ----------------------------

    public function test_all_available_slots_produce_all_slots_available_true(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.all_slots_available', true);
        $response->assertJsonPath('data.unavailable_slots', []);
    }

    public function test_unavailable_slot_is_reported_but_still_priced(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        // The only court is already fully booked for this slot.
        BookingSlot::factory()->create([
            'booking_id' => Booking::factory()->create(['status' => 'confirmed'])->id,
            'court_id' => $court->id,
            'date' => $date,
            'start_time' => '18:00:00',
            'end_time' => '19:00:00',
            'status' => 'confirmed',
        ]);

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.all_slots_available', false);
        $response->assertJsonPath('data.unavailable_slots.0.date', $date);
        $response->assertJsonPath('data.unavailable_slots.0.start_time', '18:00');
        // Still fully priced, even though it can't actually be booked.
        $response->assertJsonPath('data.total_price_baisa', 10000);
    }

    public function test_response_matches_the_documented_contract_shape(): void
    {
        $date1 = $this->futureDate(5);
        $date2 = $this->futureDate(6);
        $this->makeCourt($date1);
        $this->makeCourt($date2);

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [
                ['date' => $date1, 'start_time' => '18:00', 'end_time' => '19:00'],
                ['date' => $date2, 'start_time' => '20:00', 'end_time' => '21:00'],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'currency',
                'total_hours',
                'days' => [['date', 'hours']],
                'standard_subtotal_baisa',
                'applied_rule' => ['hours_from', 'hours_to', 'price_per_hour_baisa'],
                'discount_baisa',
                'total_price_baisa',
                'all_slots_available',
                'unavailable_slots',
            ],
        ]);
        $response->assertJsonPath('data.currency', 'OMR');
        $response->assertJsonPath('data.total_hours', 2);
        $response->assertJsonPath('data.standard_subtotal_baisa', 20000);
        $response->assertJsonPath('data.discount_baisa', 4000);
        $response->assertJsonPath('data.total_price_baisa', 16000);
    }

    public function test_response_contains_no_court_information(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
        ]);

        $response->assertOk();
        $this->assertStringNotContainsString('court', strtolower($response->getContent()));
    }

    public function test_missing_pricing_rule_returns_a_clear_error(): void
    {
        PricingRule::query()->delete();
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
        ]);

        $response->assertStatus(409);
        $response->assertJsonPath('error_code', 'NO_MATCHING_PRICING_RULE');
    }

    // --- Side-effect-free & trust boundary -----------------------------

    public function test_quote_creates_no_booking_slot_or_payment_rows(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
        ])->assertOk();

        $this->assertSame(0, Booking::count());
        $this->assertSame(0, BookingSlot::count());
        $this->assertSame(0, Payment::count());
    }

    public function test_frontend_supplied_price_and_hours_are_ignored(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings/quote', [
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
            // Attacker-supplied, must be completely ignored by the server.
            'total_hours' => 99,
            'total_price_baisa' => 1,
            'applied_rule' => ['price_per_hour_baisa' => 1],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.total_hours', 1);
        $response->assertJsonPath('data.total_price_baisa', 10000);
    }

    /** Step 17 hardening: an unauthenticated caller can no longer spam quotes without limit. */
    public function test_quote_endpoint_is_rate_limited(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $payload = ['slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']]];

        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/bookings/quote', $payload)->assertOk();
        }

        $this->postJson('/api/bookings/quote', $payload)->assertStatus(429);
    }
}
