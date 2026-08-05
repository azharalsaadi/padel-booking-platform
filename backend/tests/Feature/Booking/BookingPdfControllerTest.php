<?php

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingPdfControllerTest extends TestCase
{
    use RefreshDatabase;

    private function bookingWith(array $bookingAttrs, array $slotAttrs, array $paymentAttrs): Booking
    {
        $court = Court::factory()->create();
        $booking = Booking::factory()->create($bookingAttrs);
        BookingSlot::factory()->create(array_merge(['booking_id' => $booking->id, 'court_id' => $court->id], $slotAttrs));
        Payment::factory()->create(array_merge(['booking_id' => $booking->id], $paymentAttrs));

        return $booking->fresh(['bookingSlots', 'payments']);
    }

    public function test_downloads_a_pdf_for_a_paid_booking(): void
    {
        $booking = $this->bookingWith(
            ['status' => 'confirmed', 'payment_method' => 'pay_at_venue'],
            ['status' => 'confirmed'],
            ['method' => 'pay_at_venue', 'status' => 'paid'],
        );

        $response = $this->get("/api/bookings/{$booking->access_token}/pdf");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $response->assertHeader('content-disposition');
        $this->assertStringContainsString(
            "booking-{$booking->booking_reference}.pdf",
            $response->headers->get('content-disposition'),
        );
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_invalid_token_returns_404(): void
    {
        $this->get('/api/bookings/not-a-real-token/pdf')->assertStatus(404);
    }

    public function test_pdf_download_does_not_require_the_booking_to_be_paid(): void
    {
        // The access token itself is the credential — same protection
        // model as show/cancel/retry/refresh. The frontend button that
        // triggers this is gated to paid bookings, but the endpoint isn't
        // artificially restricted beyond needing a valid token.
        $booking = $this->bookingWith(
            ['status' => 'pending_payment', 'payment_method' => 'thawani', 'hold_expires_at' => now()->addMinutes(10)],
            ['status' => 'pending_payment'],
            ['method' => 'thawani', 'status' => 'pending'],
        );

        $this->get("/api/bookings/{$booking->access_token}/pdf")->assertOk();
    }
}
