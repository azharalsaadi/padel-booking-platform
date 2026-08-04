<?php

namespace Tests\Unit\Models;

use App\Enums\BookingSlotStatus;
use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingSlotTest extends TestCase
{
    use RefreshDatabase;

    public function test_belongs_to_booking_and_court(): void
    {
        $booking = Booking::factory()->create();
        $court = Court::factory()->create();
        $slot = BookingSlot::factory()->create(['booking_id' => $booking->id, 'court_id' => $court->id]);

        $this->assertInstanceOf(Booking::class, $slot->booking);
        $this->assertInstanceOf(Court::class, $slot->court);
        $this->assertSame($booking->id, $slot->booking->id);
        $this->assertSame($court->id, $slot->court->id);
    }

    public function test_status_is_cast_to_enum_and_date_to_carbon(): void
    {
        $slot = BookingSlot::factory()->create(['status' => 'confirmed', 'date' => '2026-08-10']);

        $this->assertInstanceOf(BookingSlotStatus::class, $slot->status);
        $this->assertSame(BookingSlotStatus::Confirmed, $slot->status);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $slot->date);
    }

    public function test_price_baisa_is_an_integer_never_a_float(): void
    {
        $slot = BookingSlot::factory()->create(['price_baisa' => 8000]);

        $this->assertIsInt($slot->price_baisa);
        $this->assertSame(8000, $slot->price_baisa);
    }

    public function test_lock_key_is_not_mass_assignable(): void
    {
        $this->assertNotContains('lock_key', (new BookingSlot())->getFillable());

        $this->expectException(MassAssignmentException::class);

        (new BookingSlot())->fill(['lock_key' => '999|2026-08-10|18:00:00']);
    }

    public function test_database_rejects_direct_writes_to_the_generated_lock_key_column(): void
    {
        $slot = BookingSlot::factory()->create();

        $this->expectException(QueryException::class);

        // Bypasses $fillable entirely via direct attribute assignment, proving
        // the *database* (not just Eloquent) is the real backstop: MySQL
        // rejects writes to a GENERATED ALWAYS column outright.
        $slot->setAttribute('lock_key', 'tampered');
        $slot->save();
    }

    public function test_active_slot_computes_lock_key_from_court_date_and_start_time(): void
    {
        $court = Court::factory()->create();
        $slot = BookingSlot::factory()->create([
            'court_id' => $court->id,
            'date' => '2026-08-10',
            'start_time' => '18:00:00',
            'status' => 'confirmed',
        ]);

        // MySQL computes GENERATED columns server-side; the in-memory model
        // must be refreshed to see what the database actually stored.
        $slot->refresh();

        $this->assertSame("{$court->id}|2026-08-10|18:00:00", $slot->lock_key);
    }

    public function test_duplicate_active_slot_for_same_court_date_and_time_is_rejected(): void
    {
        $court = Court::factory()->create();
        BookingSlot::factory()->create([
            'court_id' => $court->id,
            'date' => '2026-08-10',
            'start_time' => '18:00:00',
            'status' => 'confirmed',
        ]);

        $this->expectException(QueryException::class);

        BookingSlot::factory()->create([
            'court_id' => $court->id,
            'date' => '2026-08-10',
            'start_time' => '18:00:00',
            'status' => 'pending_payment',
        ]);
    }

    public function test_cancelled_slot_frees_the_court_and_time_for_rebooking(): void
    {
        $court = Court::factory()->create();
        $first = BookingSlot::factory()->create([
            'court_id' => $court->id,
            'date' => '2026-08-10',
            'start_time' => '18:00:00',
            'status' => 'confirmed',
        ]);

        $first->update(['status' => 'cancelled']);
        $first->refresh();
        $this->assertNull($first->lock_key);

        // Re-booking the exact same court/date/time must now succeed.
        $second = BookingSlot::factory()->create([
            'court_id' => $court->id,
            'date' => '2026-08-10',
            'start_time' => '18:00:00',
            'status' => 'confirmed',
        ]);
        $second->refresh();

        $this->assertSame("{$court->id}|2026-08-10|18:00:00", $second->lock_key);
    }

    public function test_expired_slot_also_frees_the_court_and_time_for_rebooking(): void
    {
        $court = Court::factory()->create();
        $first = BookingSlot::factory()->create([
            'court_id' => $court->id,
            'date' => '2026-08-11',
            'start_time' => '09:00:00',
            'status' => 'pending_payment',
        ]);

        $first->update(['status' => 'expired']);
        $first->refresh();
        $this->assertNull($first->lock_key);

        $second = BookingSlot::factory()->create([
            'court_id' => $court->id,
            'date' => '2026-08-11',
            'start_time' => '09:00:00',
            'status' => 'confirmed',
        ]);
        $second->refresh();

        $this->assertSame("{$court->id}|2026-08-11|09:00:00", $second->lock_key);
    }
}
