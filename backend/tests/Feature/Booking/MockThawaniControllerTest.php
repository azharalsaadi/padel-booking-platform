<?php

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\CourtWorkingHour;
use App\Models\Payment;
use App\Models\PricingRule;
use App\Services\MockThawaniService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MockThawaniControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['thawani.mode' => 'mock']);
        PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 10000, 'is_active' => true]);
    }

    private function futureDate(int $days = 5): string
    {
        return now()->addDays($days)->toDateString();
    }

    private function makeCourt(string $date): Court
    {
        $court = Court::factory()->create(['is_active' => true]);

        CourtWorkingHour::factory()->create([
            'court_id' => $court->id,
            'day_of_week' => Carbon::parse($date)->dayOfWeek,
            'open_time' => '16:00:00',
            'close_time' => '23:00:00',
        ]);

        return $court;
    }

    /** @return array<string, mixed> */
    private function createThawaniBooking(): array
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', [
            'customer_phone' => '+96891234567',
            'payment_method' => 'thawani',
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
        ]);

        $response->assertCreated();

        return $response->json('data');
    }

    private function mockSessionId(string $accessToken): string
    {
        return Payment::whereHas('booking', fn ($q) => $q->where('access_token', $accessToken))->firstOrFail()->thawani_session_id;
    }

    // --- MockThawaniService::isActive() ----------------------------------

    public function test_is_active_requires_both_mock_mode_and_a_local_or_testing_environment(): void
    {
        config(['thawani.mode' => 'mock', 'app.env' => 'testing']);
        $this->assertTrue(MockThawaniService::isActive());

        config(['thawani.mode' => 'real', 'app.env' => 'testing']);
        $this->assertFalse(MockThawaniService::isActive());

        config(['thawani.mode' => 'mock', 'app.env' => 'production']);
        $this->assertFalse(MockThawaniService::isActive());
    }

    // --- booking creation --------------------------------------------

    public function test_mock_mode_returns_a_non_null_local_checkout_url(): void
    {
        $data = $this->createThawaniBooking();

        $this->assertNotNull($data['checkout_url']);
        $this->assertStringStartsWith('http://localhost:5173/mock-thawani/', $data['checkout_url']);
        $this->assertSame('pending_payment', $data['booking_status']);
        $this->assertSame('pending', $data['payment_status']);
    }

    public function test_pay_at_venue_never_creates_a_checkout_session_even_in_mock_mode(): void
    {
        $date = $this->futureDate();
        $this->makeCourt($date);

        $response = $this->postJson('/api/bookings', [
            'customer_phone' => '+96891234567',
            'payment_method' => 'pay_at_venue',
            'slots' => [['date' => $date, 'start_time' => '18:00', 'end_time' => '19:00']],
        ]);

        $response->assertCreated();
        $this->assertArrayNotHasKey('checkout_url', $response->json('data'));
        $this->assertSame('confirmed', $response->json('data.booking_status'));
        $this->assertSame('pending', $response->json('data.payment_status'));
        $this->assertNull(Payment::first()->thawani_session_id);
    }

    // --- show -------------------------------------------------------

    public function test_show_returns_booking_reference_and_amount_without_court_or_access_token(): void
    {
        $data = $this->createThawaniBooking();
        $sessionId = $this->mockSessionId($data['access_token']);

        $response = $this->getJson("/api/mock-thawani/{$sessionId}");

        $response->assertOk();
        $response->assertJsonPath('data.booking_reference', $data['booking_reference']);
        $response->assertJsonPath('data.total_price_baisa', $data['total_price_baisa']);
        $response->assertJsonMissingPath('data.access_token');
        $response->assertJsonMissingPath('data.court_id');
    }

    public function test_show_with_unknown_session_id_returns_404(): void
    {
        $this->getJson('/api/mock-thawani/mock_does_not_exist')->assertStatus(404);
    }

    // --- succeed ------------------------------------------------------

    public function test_succeed_confirms_the_booking_and_marks_payment_paid(): void
    {
        $data = $this->createThawaniBooking();
        $sessionId = $this->mockSessionId($data['access_token']);

        $response = $this->postJson("/api/mock-thawani/{$sessionId}/succeed");

        $response->assertOk();
        $response->assertJsonPath('data.booking_status', 'confirmed');
        $response->assertJsonPath('data.payment_status', 'paid');
        $response->assertJsonPath('data.access_token', $data['access_token']);

        $booking = Booking::where('access_token', $data['access_token'])->firstOrFail();
        $this->assertSame('confirmed', $booking->status->value);
        $this->assertNotNull($booking->confirmed_at);
        $this->assertTrue($booking->bookingSlots->every(fn ($slot) => $slot->status->value === 'confirmed'));
    }

    public function test_duplicate_succeed_requests_are_idempotent(): void
    {
        $data = $this->createThawaniBooking();
        $sessionId = $this->mockSessionId($data['access_token']);

        $this->postJson("/api/mock-thawani/{$sessionId}/succeed")->assertOk();
        $second = $this->postJson("/api/mock-thawani/{$sessionId}/succeed");

        $second->assertOk();
        $second->assertJsonPath('data.booking_status', 'confirmed');
        $this->assertSame(1, Payment::where('status', 'paid')->count());
    }

    // --- fail -----------------------------------------------------------

    public function test_fail_expires_the_booking_and_releases_slots(): void
    {
        $data = $this->createThawaniBooking();
        $sessionId = $this->mockSessionId($data['access_token']);
        $slot = BookingSlot::first();
        $this->assertNotNull($slot->lock_key);

        $response = $this->postJson("/api/mock-thawani/{$sessionId}/fail");

        $response->assertOk();
        $response->assertJsonPath('data.booking_status', 'expired');
        $response->assertJsonPath('data.payment_status', 'failed');
        $this->assertNull($slot->fresh()->lock_key);
    }

    // --- security ---------------------------------------------------

    public function test_customer_cannot_mark_another_booking_as_paid_via_a_foreign_session_id(): void
    {
        $bookingA = $this->createThawaniBooking();
        $bookingB = $this->createThawaniBooking();

        $sessionA = $this->mockSessionId($bookingA['access_token']);
        $this->postJson("/api/mock-thawani/{$sessionA}/succeed")->assertOk();

        $this->assertSame('confirmed', Booking::where('access_token', $bookingA['access_token'])->first()->status->value);
        $this->assertSame('pending_payment', Booking::where('access_token', $bookingB['access_token'])->first()->status->value);
    }

    public function test_succeed_with_unknown_session_id_returns_404(): void
    {
        $this->postJson('/api/mock-thawani/mock_does_not_exist/succeed')->assertStatus(404);
    }

    // --- availability gating ---------------------------------------------

    public function test_mock_endpoints_are_unavailable_when_thawani_mode_is_not_mock(): void
    {
        $data = $this->createThawaniBooking();
        $sessionId = $this->mockSessionId($data['access_token']);

        config(['thawani.mode' => 'real']);

        $this->getJson("/api/mock-thawani/{$sessionId}")->assertStatus(404);
        $this->postJson("/api/mock-thawani/{$sessionId}/succeed")->assertStatus(404);
        $this->postJson("/api/mock-thawani/{$sessionId}/fail")->assertStatus(404);
    }
}
