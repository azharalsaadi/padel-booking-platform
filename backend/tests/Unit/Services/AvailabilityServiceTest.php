<?php

namespace Tests\Unit\Services;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\CourtClosure;
use App\Models\CourtWorkingHour;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AvailabilityServiceTest extends TestCase
{
    use RefreshDatabase;

    private AvailabilityService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AvailabilityService();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** A future date far enough out to never collide with "today" edge cases. */
    private function futureDate(int $days = 5): string
    {
        return now()->addDays($days)->toDateString();
    }

    private function makeCourt(string $date, string $open = '16:00:00', string $close = '23:00:00', bool $active = true): Court
    {
        $court = Court::factory()->create(['is_active' => $active]);

        CourtWorkingHour::factory()->create([
            'court_id' => $court->id,
            'day_of_week' => Carbon::parse($date)->dayOfWeek,
            'open_time' => $open,
            'close_time' => $close,
        ]);

        return $court;
    }

    private function bookSlot(Court $court, string $date, string $start, string $end, string $status, ?Carbon $holdExpiresAt = null): BookingSlot
    {
        // booking_slots.status mirrors its parent booking's status by design.
        $booking = Booking::factory()->create([
            'status' => $status,
            'payment_method' => 'thawani',
            'hold_expires_at' => $holdExpiresAt,
        ]);

        return BookingSlot::factory()->create([
            'booking_id' => $booking->id,
            'court_id' => $court->id,
            'date' => $date,
            'start_time' => $start,
            'end_time' => $end,
            'status' => $status,
        ]);
    }

    private function findSlot(array $slots, string $startTime): ?array
    {
        foreach ($slots as $slot) {
            if ($slot['start_time'] === $startTime) {
                return $slot;
            }
        }

        return null;
    }

    // --- Court-count aggregation ---------------------------------------

    public function test_slot_available_with_three_free_courts(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date);
        $this->makeCourt($date);

        $slots = $this->service->getSlotsForDate($date);

        $this->assertTrue($this->findSlot($slots, '18:00')['available']);
    }

    public function test_slot_remains_visible_after_one_court_booked(): void
    {
        $date = $this->futureDate();
        $c1 = $this->makeCourt($date);
        $this->makeCourt($date);
        $this->makeCourt($date);

        $this->bookSlot($c1, $date, '18:00:00', '19:00:00', 'confirmed');

        $slots = $this->service->getSlotsForDate($date);

        $this->assertTrue($this->findSlot($slots, '18:00')['available']);
    }

    public function test_slot_remains_visible_after_two_courts_booked(): void
    {
        $date = $this->futureDate();
        $c1 = $this->makeCourt($date);
        $c2 = $this->makeCourt($date);
        $this->makeCourt($date);

        $this->bookSlot($c1, $date, '18:00:00', '19:00:00', 'confirmed');
        $this->bookSlot($c2, $date, '18:00:00', '19:00:00', 'confirmed');

        $slots = $this->service->getSlotsForDate($date);

        $this->assertTrue($this->findSlot($slots, '18:00')['available']);
    }

    public function test_slot_disappears_after_all_three_courts_booked(): void
    {
        $date = $this->futureDate();
        $c1 = $this->makeCourt($date);
        $c2 = $this->makeCourt($date);
        $c3 = $this->makeCourt($date);

        $this->bookSlot($c1, $date, '18:00:00', '19:00:00', 'confirmed');
        $this->bookSlot($c2, $date, '18:00:00', '19:00:00', 'confirmed');
        $this->bookSlot($c3, $date, '18:00:00', '19:00:00', 'confirmed');

        $slots = $this->service->getSlotsForDate($date);

        $this->assertFalse($this->findSlot($slots, '18:00')['available']);
    }

    public function test_inactive_courts_are_ignored(): void
    {
        $date = $this->futureDate();
        $c1 = $this->makeCourt($date);
        $c2 = $this->makeCourt($date);
        $c3 = $this->makeCourt($date);
        $this->makeCourt($date, active: false); // inactive court, always free, must not count

        $this->bookSlot($c1, $date, '18:00:00', '19:00:00', 'confirmed');
        $this->bookSlot($c2, $date, '18:00:00', '19:00:00', 'confirmed');
        $this->bookSlot($c3, $date, '18:00:00', '19:00:00', 'confirmed');

        $slots = $this->service->getSlotsForDate($date);

        $this->assertFalse($this->findSlot($slots, '18:00')['available']);
    }

    // --- Closures ---------------------------------------------------------

    public function test_court_specific_full_day_closure_blocks_all_slots(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        CourtClosure::factory()->create([
            'court_id' => $court->id,
            'date_start' => $date,
            'date_end' => $date,
            'is_full_day' => true,
        ]);

        $slots = $this->service->getSlotsForDate($date);

        $this->assertFalse($this->findSlot($slots, '18:00')['available']);
    }

    public function test_global_full_day_closure_blocks_every_court(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date);

        CourtClosure::factory()->create([
            'court_id' => null,
            'date_start' => $date,
            'date_end' => $date,
            'is_full_day' => true,
        ]);

        $slots = $this->service->getSlotsForDate($date);

        $this->assertFalse($this->findSlot($slots, '18:00')['available']);
    }

    public function test_partial_time_closure_blocks_only_the_overlapping_slot(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date, '08:00:00', '23:00:00');

        CourtClosure::factory()->create([
            'court_id' => $court->id,
            'date_start' => $date,
            'date_end' => $date,
            'is_full_day' => false,
            'start_time' => '10:00:00',
            'end_time' => '12:00:00',
        ]);

        $slots = $this->service->getSlotsForDate($date);

        $this->assertFalse($this->findSlot($slots, '10:00')['available'], 'inside closure');
        $this->assertFalse($this->findSlot($slots, '11:00')['available'], 'inside closure');
        $this->assertTrue($this->findSlot($slots, '09:00')['available'], 'before closure, no overlap');
        $this->assertTrue($this->findSlot($slots, '12:00')['available'], 'exactly at closure end, no overlap');
    }

    public function test_date_range_closure_covers_every_date_in_range(): void
    {
        $start = now()->addDays(5);
        $middle = $start->copy()->addDays(1)->toDateString();
        $court = $this->makeCourt($middle);

        CourtClosure::factory()->create([
            'court_id' => $court->id,
            'date_start' => $start->toDateString(),
            'date_end' => $start->copy()->addDays(3)->toDateString(),
            'is_full_day' => true,
        ]);

        $slots = $this->service->getSlotsForDate($middle);

        $this->assertFalse($this->findSlot($slots, '18:00')['available']);
    }

    // --- Working hours ------------------------------------------------

    public function test_different_working_hours_across_courts_are_aggregated(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date, '16:00:00', '18:00:00'); // court A: 16-18
        $this->makeCourt($date, '20:00:00', '22:00:00'); // court B: 20-22

        $slots = $this->service->getSlotsForDate($date);

        $this->assertTrue($this->findSlot($slots, '16:00')['available']);
        $this->assertTrue($this->findSlot($slots, '20:00')['available']);
        $this->assertNull($this->findSlot($slots, '19:00'), 'no court is open at 19:00, slot should not exist at all');
    }

    public function test_slot_boundaries_never_extend_past_closing_time(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date, '16:00:00', '18:30:00');

        $slots = $this->service->getSlotsForDate($date);

        $this->assertNotNull($this->findSlot($slots, '16:00'));
        $this->assertNotNull($this->findSlot($slots, '17:00'));
        $this->assertNull($this->findSlot($slots, '18:00'), '18:00-19:00 would extend past the 18:30 close time');
    }

    // --- Past date / time filtering ------------------------------------

    public function test_past_times_on_the_current_date_are_hidden(): void
    {
        $frozenNow = now()->setTime(15, 30, 0);
        Carbon::setTestNow($frozenNow);
        $today = $frozenNow->toDateString();

        $this->makeCourt($today, '10:00:00', '20:00:00');

        $slots = $this->service->getSlotsForDate($today);

        $this->assertNull($this->findSlot($slots, '14:00'), 'already in the past relative to frozen "now"');
        $this->assertNull($this->findSlot($slots, '15:00'), 'currently in progress, must not be bookable');
        $this->assertNotNull($this->findSlot($slots, '16:00'), 'still upcoming');
    }

    // --- Booking-slot status blocking -----------------------------------

    public function test_confirmed_slot_blocks_availability(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        $this->bookSlot($court, $date, '18:00:00', '19:00:00', 'confirmed');

        $slots = $this->service->getSlotsForDate($date);

        $this->assertFalse($this->findSlot($slots, '18:00')['available']);
    }

    public function test_active_pending_payment_hold_blocks_availability(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        $this->bookSlot($court, $date, '18:00:00', '19:00:00', 'pending_payment', now()->addMinutes(10));

        $slots = $this->service->getSlotsForDate($date);

        $this->assertFalse($this->findSlot($slots, '18:00')['available']);
    }

    public function test_expired_pending_payment_hold_does_not_block_availability(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        // hold_expires_at already passed, but the row's own status column
        // is still 'pending_payment' — simulating the expiry job not
        // having run yet. Must not hide the slot regardless.
        $this->bookSlot($court, $date, '18:00:00', '19:00:00', 'pending_payment', now()->subMinutes(5));

        $slots = $this->service->getSlotsForDate($date);

        $this->assertTrue($this->findSlot($slots, '18:00')['available']);
    }

    public function test_cancelled_and_expired_slots_do_not_block_availability(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        $this->bookSlot($court, $date, '18:00:00', '19:00:00', 'cancelled');
        $this->bookSlot($court, $date, '19:00:00', '20:00:00', 'expired');

        $slots = $this->service->getSlotsForDate($date);

        $this->assertTrue($this->findSlot($slots, '18:00')['available']);
        $this->assertTrue($this->findSlot($slots, '19:00')['available']);
    }

    // --- Performance ------------------------------------------------------

    public function test_query_count_does_not_grow_with_the_number_of_courts(): void
    {
        $date = $this->futureDate();

        for ($i = 0; $i < 3; $i++) {
            $this->makeCourt($date);
        }

        DB::enableQueryLog();
        $this->service->getSlotsForDate($date);
        $countWithThreeCourts = count(DB::getQueryLog());
        DB::flushQueryLog();

        for ($i = 0; $i < 10; $i++) {
            $this->makeCourt($date);
        }
        DB::flushQueryLog(); // discard the setup INSERTs, only the service's own queries count below

        $this->service->getSlotsForDate($date);
        $countWithThirteenCourts = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertSame($countWithThreeCourts, $countWithThirteenCourts);
        $this->assertLessThanOrEqual(4, $countWithThirteenCourts, 'expected a small, fixed number of bulk queries');
    }
}
