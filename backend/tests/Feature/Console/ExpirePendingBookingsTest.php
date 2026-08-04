<?php

namespace Tests\Feature\Console;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpirePendingBookingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_expires_a_lapsed_pending_payment_booking_and_frees_its_slots(): void
    {
        $booking = Booking::factory()->create([
            'status' => 'pending_payment',
            'payment_method' => 'thawani',
            'hold_expires_at' => now()->subMinutes(5),
        ]);
        $slot = BookingSlot::factory()->create(['booking_id' => $booking->id, 'status' => 'pending_payment']);
        $payment = Payment::factory()->create(['booking_id' => $booking->id, 'method' => 'thawani', 'status' => 'pending']);

        $this->artisan('bookings:expire-pending')->assertSuccessful();

        $this->assertSame('expired', $booking->fresh()->status->value);
        $this->assertSame('expired', $slot->fresh()->status->value);
        $this->assertSame('expired', $payment->fresh()->status->value);
        $this->assertNull($slot->fresh()->lock_key, 'expiring must free the slot for rebooking');
    }

    public function test_does_not_touch_a_booking_whose_hold_has_not_lapsed_yet(): void
    {
        $booking = Booking::factory()->create([
            'status' => 'pending_payment',
            'payment_method' => 'thawani',
            'hold_expires_at' => now()->addMinutes(10),
        ]);

        $this->artisan('bookings:expire-pending')->assertSuccessful();

        $this->assertSame('pending_payment', $booking->fresh()->status->value);
    }

    public function test_does_not_touch_a_confirmed_pay_at_venue_booking(): void
    {
        $booking = Booking::factory()->create([
            'status' => 'confirmed',
            'payment_method' => 'pay_at_venue',
            'hold_expires_at' => null,
        ]);

        $this->artisan('bookings:expire-pending')->assertSuccessful();

        $this->assertSame('confirmed', $booking->fresh()->status->value);
    }

    public function test_does_not_touch_an_already_expired_booking(): void
    {
        $booking = Booking::factory()->create([
            'status' => 'expired',
            'payment_method' => 'thawani',
            'hold_expires_at' => now()->subDay(),
        ]);

        $this->artisan('bookings:expire-pending')->assertSuccessful();

        // No error, no double-processing — still just expired.
        $this->assertSame('expired', $booking->fresh()->status->value);
    }
}
