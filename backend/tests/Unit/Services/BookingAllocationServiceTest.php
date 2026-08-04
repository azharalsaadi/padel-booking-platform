<?php

namespace Tests\Unit\Services;

use App\Exceptions\Booking\SlotUnavailableException;
use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\CourtClosure;
use App\Models\CourtWorkingHour;
use App\Services\BookingAllocationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BookingAllocationServiceTest extends TestCase
{
    use RefreshDatabase;

    private BookingAllocationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new BookingAllocationService();
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

    private function slot(string $date, string $start, string $end): array
    {
        return ['date' => $date, 'start_time' => $start, 'end_time' => $end];
    }

    /** Runs $service->allocate() inside a real transaction, as production always will. */
    private function allocateInTransaction(array $slots): array
    {
        return DB::transaction(fn () => $this->service->allocate($slots));
    }

    public function test_allocates_a_single_slot_to_one_of_the_active_courts(): void
    {
        $date = $this->futureDate();
        $c1 = $this->makeCourt($date);

        $assignments = $this->allocateInTransaction([$this->slot($date, '18:00', '19:00')]);

        $this->assertCount(1, $assignments);
        $this->assertSame($c1->id, $assignments[0]['court_id']);
    }

    public function test_consecutive_run_keeps_one_court_when_a_single_court_covers_it(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date);
        $this->makeCourt($date);

        $assignments = $this->allocateInTransaction([
            $this->slot($date, '18:00', '19:00'),
            $this->slot($date, '19:00', '20:00'),
            $this->slot($date, '20:00', '21:00'),
        ]);

        $this->assertCount(3, $assignments);
        $courtIds = array_unique(array_column($assignments, 'court_id'));
        $this->assertCount(1, $courtIds, 'a single court should cover the whole consecutive run when one is free for all 3 hours');
    }

    public function test_falls_back_to_per_slot_courts_when_no_single_court_covers_the_whole_run(): void
    {
        $date = $this->futureDate();
        $courtA = $this->makeCourt($date);
        $courtB = $this->makeCourt($date);

        // Court A is busy at 19:00, Court B is busy at 18:00 — neither
        // court is free for BOTH hours of the run, but each hour has a
        // free court individually.
        $this->occupy($courtA, $date, '19:00:00', '20:00:00');
        $this->occupy($courtB, $date, '18:00:00', '19:00:00');

        $assignments = $this->allocateInTransaction([
            $this->slot($date, '18:00', '19:00'),
            $this->slot($date, '19:00', '20:00'),
        ]);

        $this->assertCount(2, $assignments);
        $byStart = collect($assignments)->keyBy('start_time');
        $this->assertSame($courtA->id, $byStart['18:00']['court_id'], 'only court A is free at 18:00');
        $this->assertSame($courtB->id, $byStart['19:00']['court_id'], 'only court B is free at 19:00');
    }

    public function test_multi_day_booking_allocates_a_court_for_each_date_independently(): void
    {
        $date1 = $this->futureDate(5);
        $date2 = $this->futureDate(6);
        $this->makeCourt($date1);
        $this->makeCourt($date2);

        $assignments = $this->allocateInTransaction([
            $this->slot($date1, '18:00', '19:00'),
            $this->slot($date2, '20:00', '21:00'),
        ]);

        $this->assertCount(2, $assignments);
        $this->assertEqualsCanonicalizing([$date1, $date2], array_column($assignments, 'date'));
    }

    public function test_non_consecutive_slots_on_the_same_date_are_evaluated_as_separate_runs(): void
    {
        $date = $this->futureDate();
        $courtA = $this->makeCourt($date);
        $courtB = $this->makeCourt($date);

        // A gap at 19:00 means 18:00 and 20:00 are two separate 1-slot
        // runs, not one 3-slot run. Court A is only free for 18:00; court
        // B only free for 20:00 — this only succeeds if treated separately.
        $this->occupy($courtA, $date, '20:00:00', '21:00:00');
        $this->occupy($courtB, $date, '18:00:00', '19:00:00');

        $assignments = $this->allocateInTransaction([
            $this->slot($date, '18:00', '19:00'),
            $this->slot($date, '20:00', '21:00'),
        ]);

        $byStart = collect($assignments)->keyBy('start_time');
        $this->assertSame($courtA->id, $byStart['18:00']['court_id'], 'court A is only busy at 20:00, so it is the one free at 18:00');
        $this->assertSame($courtB->id, $byStart['20:00']['court_id'], 'court B is only busy at 18:00, so it is the one free at 20:00');
    }

    public function test_random_selection_is_not_always_the_lowest_id(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);
        $this->makeCourt($date);
        $this->makeCourt($date);

        $chosen = [];
        for ($i = 0; $i < 30; $i++) {
            // Fresh transaction per attempt, rolled back so courts stay free.
            DB::beginTransaction();
            $assignments = $this->service->allocate([$this->slot($date, '18:00', '19:00')]);
            $chosen[] = $assignments[0]['court_id'];
            DB::rollBack();
        }

        $this->assertGreaterThan(1, count(array_unique($chosen)), 'expected random distribution across courts, not a fixed pick');
    }

    public function test_throws_slot_unavailable_when_every_active_court_is_taken(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);
        $this->occupy($court, $date, '18:00:00', '19:00:00');

        $this->expectException(SlotUnavailableException::class);

        $this->allocateInTransaction([$this->slot($date, '18:00', '19:00')]);
    }

    public function test_unavailable_exception_carries_all_unavailable_slots_not_just_the_first(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);
        $this->occupy($court, $date, '18:00:00', '19:00:00');
        $this->occupy($court, $date, '20:00:00', '21:00:00');

        try {
            $this->allocateInTransaction([
                $this->slot($date, '18:00', '19:00'),
                $this->slot($date, '20:00', '21:00'),
            ]);
            $this->fail('Expected SlotUnavailableException.');
        } catch (SlotUnavailableException $e) {
            $this->assertCount(2, $e->unavailableSlots());
        }
    }

    public function test_court_closed_for_the_full_day_is_never_assigned(): void
    {
        $date = $this->futureDate();
        $court = $this->makeCourt($date);

        CourtClosure::factory()->create([
            'court_id' => $court->id,
            'date_start' => $date,
            'date_end' => $date,
            'is_full_day' => true,
        ]);

        $this->expectException(SlotUnavailableException::class);

        $this->allocateInTransaction([$this->slot($date, '18:00', '19:00')]);
    }

    public function test_inactive_courts_are_never_candidates(): void
    {
        $date = $this->futureDate();
        Court::factory()->create(['is_active' => false]);

        $this->expectException(SlotUnavailableException::class);

        $this->allocateInTransaction([$this->slot($date, '18:00', '19:00')]);
    }

    private function occupy(Court $court, string $date, string $start, string $end): BookingSlot
    {
        $booking = Booking::factory()->create(['status' => 'confirmed']);

        return BookingSlot::factory()->create([
            'booking_id' => $booking->id,
            'court_id' => $court->id,
            'date' => $date,
            'start_time' => $start,
            'end_time' => $end,
            'status' => 'confirmed',
        ]);
    }
}
