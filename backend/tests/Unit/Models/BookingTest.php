<?php

namespace Tests\Unit\Models;

use App\Enums\BookingStatus;
use App\Enums\PaymentMethod;
use App\Models\AdminUser;
use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_and_payment_method_are_cast_to_enums(): void
    {
        $booking = Booking::factory()->create([
            'status' => 'pending_payment',
            'payment_method' => 'thawani',
        ]);

        $this->assertInstanceOf(BookingStatus::class, $booking->status);
        $this->assertSame(BookingStatus::PendingPayment, $booking->status);
        $this->assertInstanceOf(PaymentMethod::class, $booking->payment_method);
        $this->assertSame(PaymentMethod::Thawani, $booking->payment_method);
    }

    public function test_has_many_booking_slots(): void
    {
        $booking = Booking::factory()->create();
        BookingSlot::factory()->count(3)->create(['booking_id' => $booking->id]);

        $this->assertCount(3, $booking->bookingSlots);
        $this->assertInstanceOf(BookingSlot::class, $booking->bookingSlots->first());
    }

    public function test_has_many_payments(): void
    {
        $booking = Booking::factory()->create();
        Payment::factory()->count(2)->create(['booking_id' => $booking->id]);

        $this->assertCount(2, $booking->payments);
    }

    public function test_created_by_admin_relationship_is_nullable(): void
    {
        $booking = Booking::factory()->create(['created_by_admin_id' => null]);

        $this->assertNull($booking->createdByAdmin);
    }

    public function test_created_by_admin_relationship_resolves(): void
    {
        $admin = AdminUser::factory()->create();
        $booking = Booking::factory()->create(['created_by_admin_id' => $admin->id]);

        $this->assertInstanceOf(AdminUser::class, $booking->createdByAdmin);
    }

    public function test_total_price_baisa_is_an_integer_never_a_float(): void
    {
        $booking = Booking::factory()->create(['total_price_baisa' => 16000]);

        $this->assertIsInt($booking->total_price_baisa);
        $this->assertSame(16000, $booking->total_price_baisa);
    }

    public function test_booking_reference_and_access_token_are_not_mass_assignable(): void
    {
        $this->assertNotContains('booking_reference', (new Booking())->getFillable());
        $this->assertNotContains('access_token', (new Booking())->getFillable());

        // AppServiceProvider::boot() turns silent-discard into a loud exception
        // outside production, so attempting to mass-assign a guarded field throws.
        $this->expectException(\Illuminate\Database\Eloquent\MassAssignmentException::class);

        (new Booking())->fill(['booking_reference' => 'BK-HACKED-000001']);
    }

    public function test_customer_phone_is_required_name_and_email_are_optional(): void
    {
        $booking = Booking::factory()->create([
            'customer_phone' => '+96891112222',
            'customer_name' => null,
            'customer_email' => null,
        ]);

        $this->assertSame('+96891112222', $booking->customer_phone);
        $this->assertNull($booking->customer_name);
        $this->assertNull($booking->customer_email);
    }
}
