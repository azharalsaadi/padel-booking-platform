<?php

namespace Tests\Feature\Availability;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\CourtWorkingHour;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvailabilityControllerTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_date_is_required(): void
    {
        $response = $this->getJson('/api/availability');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('date');
    }

    public function test_date_must_be_a_valid_format(): void
    {
        $response = $this->getJson('/api/availability?date=10-08-2026');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('date');
    }

    public function test_past_dates_are_rejected(): void
    {
        $yesterday = now()->subDay()->toDateString();

        $response = $this->getJson("/api/availability?date={$yesterday}");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('date');
    }

    public function test_today_is_accepted(): void
    {
        $today = now()->toDateString();

        $response = $this->getJson("/api/availability?date={$today}");

        $response->assertOk();
    }

    public function test_returns_only_available_slots_in_the_documented_shape(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->getJson("/api/availability?date={$date}");

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                ['date', 'start_time', 'end_time', 'available'],
            ],
        ]);
        $response->assertJsonPath('data.0.date', $date);
        $response->assertJsonPath('data.0.start_time', '16:00');
        $response->assertJsonPath('data.0.end_time', '17:00');
        $response->assertJsonPath('data.0.available', true);
    }

    public function test_fully_booked_slots_are_absent_from_the_response_entirely(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date, '16:00:00', '17:00:00'); // exactly one slot: 16:00-17:00

        BookingSlot::factory()->create([
            'booking_id' => Booking::factory()->create(['status' => 'confirmed'])->id,
            'court_id' => $court->id,
            'date' => $date,
            'start_time' => '16:00:00',
            'end_time' => '17:00:00',
            'status' => 'confirmed',
        ]);

        $response = $this->getJson("/api/availability?date={$date}");

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    }

    public function test_response_never_contains_court_information(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date);

        $response = $this->getJson("/api/availability?date={$date}");

        $response->assertOk();

        $forbiddenKeys = ['court_id', 'court_name', 'court_number', 'court', 'assigned_court', 'available_court_count', 'remaining_court_count', 'courts'];

        foreach ($response->json('data') as $slot) {
            $this->assertEqualsCanonicalizing(['date', 'start_time', 'end_time', 'available'], array_keys($slot));

            foreach ($forbiddenKeys as $key) {
                $this->assertArrayNotHasKey($key, $slot);
            }
        }

        $this->assertStringNotContainsString('court', strtolower($response->getContent()));
    }
}
