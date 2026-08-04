<?php

namespace Tests\Unit\Models;

use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\CourtClosure;
use App\Models\CourtWorkingHour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourtTest extends TestCase
{
    use RefreshDatabase;

    public function test_is_active_is_cast_to_boolean(): void
    {
        $court = Court::factory()->create(['is_active' => 1]);

        $this->assertIsBool($court->is_active);
        $this->assertTrue($court->is_active);
    }

    public function test_has_many_working_hours(): void
    {
        $court = Court::factory()->create();
        CourtWorkingHour::factory()
            ->count(7)
            ->sequence(fn ($sequence) => ['day_of_week' => $sequence->index])
            ->create(['court_id' => $court->id]);

        $this->assertCount(7, $court->workingHours);
        $this->assertInstanceOf(CourtWorkingHour::class, $court->workingHours->first());
    }

    public function test_has_many_closures(): void
    {
        $court = Court::factory()->create();
        CourtClosure::factory()->count(2)->create(['court_id' => $court->id]);

        $this->assertCount(2, $court->closures);
    }

    public function test_has_many_booking_slots(): void
    {
        $court = Court::factory()->create();
        // Distinct start_time per slot: identical (court, date, start_time)
        // would collide on the unique lock_key, same as real booking data.
        BookingSlot::factory()
            ->count(2)
            ->sequence(fn ($sequence) => ['start_time' => sprintf('%02d:00:00', 18 + $sequence->index)])
            ->create(['court_id' => $court->id]);

        $this->assertCount(2, $court->bookingSlots);
    }

    public function test_soft_delete_hides_court_from_default_queries_but_preserves_row(): void
    {
        $court = Court::factory()->create();
        $id = $court->id;

        $court->delete();

        $this->assertNull(Court::find($id));
        $trashed = Court::withTrashed()->find($id);
        $this->assertNotNull($trashed);
        $this->assertTrue($trashed->trashed());
        $this->assertNotNull($trashed->deleted_at);
    }

    public function test_soft_deleted_court_still_satisfies_booking_slot_foreign_key(): void
    {
        $court = Court::factory()->create();
        $slot = BookingSlot::factory()->create(['court_id' => $court->id]);

        $court->delete();
        $slot->refresh();

        // Historical booking data must remain valid after a court is retired.
        $this->assertSame($court->id, $slot->court_id);
        $this->assertNotNull($slot->court()->withTrashed()->first());
    }
}
