<?php

namespace Tests\Unit\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_belongs_to_booking(): void
    {
        $booking = Booking::factory()->create();
        $payment = Payment::factory()->create(['booking_id' => $booking->id]);

        $this->assertInstanceOf(Booking::class, $payment->booking);
        $this->assertSame($booking->id, $payment->booking->id);
    }

    public function test_method_and_status_are_cast_to_enums(): void
    {
        $payment = Payment::factory()->create(['method' => 'thawani', 'status' => 'paid']);

        $this->assertInstanceOf(PaymentMethod::class, $payment->method);
        $this->assertSame(PaymentMethod::Thawani, $payment->method);
        $this->assertInstanceOf(PaymentStatus::class, $payment->status);
        $this->assertSame(PaymentStatus::Paid, $payment->status);
    }

    public function test_raw_payload_is_cast_to_array(): void
    {
        $payment = Payment::factory()->create();
        $payment->raw_payload = ['event' => 'checkout.completed', 'amount' => 16000];
        $payment->save();
        $payment->refresh();

        $this->assertIsArray($payment->raw_payload);
        $this->assertSame('checkout.completed', $payment->raw_payload['event']);
    }

    public function test_amount_baisa_is_an_integer_never_a_float(): void
    {
        $payment = Payment::factory()->create(['amount_baisa' => 16000]);

        $this->assertIsInt($payment->amount_baisa);
        $this->assertSame(16000, $payment->amount_baisa);
    }

    public function test_gateway_fields_are_not_mass_assignable(): void
    {
        $fillable = (new Payment())->getFillable();

        $this->assertNotContains('thawani_session_id', $fillable);
        $this->assertNotContains('thawani_payment_id', $fillable);
        $this->assertNotContains('checkout_url', $fillable);
        $this->assertNotContains('raw_payload', $fillable);
        $this->assertNotContains('paid_at', $fillable);
        $this->assertNotContains('failed_at', $fillable);

        $this->expectException(MassAssignmentException::class);

        (new Payment())->fill(['thawani_session_id' => 'checkout_hacked']);
    }

    public function test_gateway_fields_can_still_be_set_directly_by_service_code(): void
    {
        $payment = Payment::factory()->create();

        // PaymentService (Step 10) sets these via direct attribute assignment,
        // which $fillable does not restrict — only mass assignment is guarded.
        $payment->thawani_session_id = 'checkout_abc123';
        $payment->save();
        $payment->refresh();

        $this->assertSame('checkout_abc123', $payment->thawani_session_id);
    }
}
