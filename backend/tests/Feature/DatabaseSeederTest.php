<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\CourtClosure;
use App\Models\CourtWorkingHour;
use App\Models\Payment;
use App\Models\PricingRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_exactly_one_admin_user_with_documented_credentials(): void
    {
        $this->assertSame(1, AdminUser::count());

        $admin = AdminUser::first();
        $this->assertSame('admin@padel.test', $admin->email);
        $this->assertTrue(Hash::check('Password123!', $admin->password));
        $this->assertNotSame('Password123!', $admin->password);
    }

    public function test_at_least_three_active_courts_with_admin_only_simple_names(): void
    {
        $courts = Court::all();

        $this->assertGreaterThanOrEqual(3, $courts->count());
        $this->assertTrue($courts->every(fn (Court $c) => $c->is_active === true));
        $this->assertEqualsCanonicalizing(['Court 1', 'Court 2', 'Court 3'], $courts->pluck('name')->all());
    }

    public function test_every_court_has_a_full_weekly_working_hours_schedule(): void
    {
        foreach (Court::all() as $court) {
            $days = CourtWorkingHour::where('court_id', $court->id)->pluck('day_of_week')->sort()->values();
            $this->assertEquals(range(0, 6), $days->all(), "Court {$court->id} is missing a weekday.");
        }

        // Sun-Thu (0-4): 16:00-23:00; Fri-Sat (5-6): 14:00-23:00.
        $sample = CourtWorkingHour::where('day_of_week', 0)->first();
        $this->assertSame('16:00:00', $sample->open_time);
        $weekend = CourtWorkingHour::where('day_of_week', 5)->first();
        $this->assertSame('14:00:00', $weekend->open_time);
    }

    public function test_pricing_rules_are_global_non_overlapping_and_integer_baisa(): void
    {
        $rules = PricingRule::orderBy('hours_from')->get();

        $this->assertCount(3, $rules);
        $this->assertSame([1, 2, 3], $rules->pluck('hours_from')->all());
        $this->assertSame([1, 2, null], $rules->pluck('hours_to')->all());
        $this->assertSame([10000, 8000, 7000], $rules->pluck('price_per_hour_baisa')->all());

        foreach ($rules as $rule) {
            $this->assertIsInt($rule->price_per_hour_baisa);
        }
    }

    public function test_closures_cover_every_required_scenario(): void
    {
        $this->assertTrue(CourtClosure::whereNull('court_id')->exists(), 'Missing a global (all-courts) closure.');
        $this->assertTrue(CourtClosure::whereNotNull('court_id')->where('is_full_day', true)->exists(), 'Missing a full-day single-court closure.');
        $this->assertTrue(CourtClosure::where('is_full_day', false)->whereNotNull('start_time')->whereNotNull('end_time')->exists(), 'Missing a partial-time closure.');

        $batched = CourtClosure::whereNotNull('batch_id')
            ->select('batch_id')
            ->groupBy('batch_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();
        $this->assertGreaterThanOrEqual(1, $batched->count(), 'Missing a multi-court closure sharing one batch_id.');
    }

    public function test_all_seeded_dates_are_in_the_future(): void
    {
        $pastClosures = CourtClosure::whereDate('date_start', '<', now()->toDateString())->count();
        $this->assertSame(0, $pastClosures);
    }

    public function test_bookings_cover_every_required_scenario(): void
    {
        $this->assertTrue(Booking::where('status', 'confirmed')->where('payment_method', 'pay_at_venue')->exists(), 'Missing pay-at-venue confirmed booking.');
        $this->assertTrue(Booking::where('status', 'pending_payment')->where('payment_method', 'thawani')->exists(), 'Missing Thawani pending_payment booking.');
        $this->assertTrue(
            Booking::where('status', 'confirmed')->where('payment_method', 'thawani')
                ->whereHas('payments', fn ($q) => $q->where('status', 'paid'))
                ->exists(),
            'Missing confirmed + paid Thawani booking.'
        );
        $this->assertTrue(Booking::where('status', 'cancelled')->exists(), 'Missing a cancelled booking.');
        $this->assertTrue(Booking::where('status', 'expired')->exists(), 'Missing an expired booking.');

        $multiHour = Booking::whereHas('bookingSlots', fn ($q) => true)
            ->get()
            ->first(fn (Booking $b) => $b->bookingSlots->count() > 1 && $b->bookingSlots->pluck('date')->unique()->count() === 1);
        $this->assertNotNull($multiHour, 'Missing a multi-hour (same day) booking.');

        $multiDay = Booking::all()->first(fn (Booking $b) => $b->bookingSlots->pluck('date')->unique()->count() > 1);
        $this->assertNotNull($multiDay, 'Missing a multi-day booking.');
    }

    public function test_every_booking_has_at_least_one_matching_payment_record(): void
    {
        $withoutPayment = Booking::doesntHave('payments')->count();
        $this->assertSame(0, $withoutPayment);

        foreach (Booking::with('payments')->get() as $booking) {
            foreach ($booking->payments as $payment) {
                $this->assertSame($booking->payment_method, $payment->method);
            }
        }
    }

    public function test_pay_at_venue_payments_default_to_pending_status(): void
    {
        $payAtVenuePayments = Payment::where('method', 'pay_at_venue')
            ->whereHas('booking', fn ($q) => $q->where('status', '!=', 'cancelled'))
            ->get();

        foreach ($payAtVenuePayments as $payment) {
            $this->assertSame('pending', $payment->status->value);
        }
    }

    public function test_thawani_payments_use_fake_sandbox_style_identifiers_only(): void
    {
        $thawaniPayments = Payment::where('method', 'thawani')->whereNotNull('thawani_session_id')->get();

        $this->assertGreaterThan(0, $thawaniPayments->count());

        foreach ($thawaniPayments as $payment) {
            $this->assertStringStartsWith('checkout_demo_', $payment->thawani_session_id);
            // No real Thawani secret/API key shape anywhere in seeded data.
            $this->assertStringNotContainsString('sk_', (string) $payment->thawani_session_id);
        }
    }

    public function test_paid_bookings_have_paid_at_set_and_pending_ones_do_not(): void
    {
        $paid = Payment::where('status', 'paid')->get();
        $this->assertGreaterThan(0, $paid->count());
        foreach ($paid as $payment) {
            $this->assertNotNull($payment->paid_at);
        }

        $pending = Payment::where('status', 'pending')->get();
        foreach ($pending as $payment) {
            $this->assertNull($payment->paid_at);
        }
    }

    public function test_no_active_duplicate_court_date_time_assignments_exist(): void
    {
        $duplicates = DB::table('booking_slots')
            ->whereNotNull('lock_key')
            ->select('lock_key')
            ->groupBy('lock_key')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $this->assertCount(0, $duplicates, 'Found duplicate active (court, date, start_time) assignments.');
    }

    public function test_all_seeded_monetary_values_are_integer_baisa(): void
    {
        foreach (Booking::all() as $booking) {
            $this->assertIsInt($booking->total_price_baisa);
        }
        foreach (BookingSlot::all() as $slot) {
            $this->assertIsInt($slot->price_baisa);
        }
        foreach (Payment::all() as $payment) {
            $this->assertIsInt($payment->amount_baisa);
        }
        foreach (PricingRule::all() as $rule) {
            $this->assertIsInt($rule->price_per_hour_baisa);
        }
    }

    public function test_booking_totals_equal_the_sum_of_their_slot_prices(): void
    {
        foreach (Booking::with('bookingSlots')->get() as $booking) {
            $this->assertSame(
                $booking->bookingSlots->sum('price_baisa'),
                $booking->total_price_baisa,
                "Booking {$booking->booking_reference} total does not match its slots."
            );
        }
    }

    public function test_customer_phone_numbers_look_like_omani_mobile_numbers(): void
    {
        foreach (Booking::all() as $booking) {
            if ($booking->customer_phone !== null) {
                $this->assertMatchesRegularExpression('/^\+968\d{8}$/', $booking->customer_phone);
            }
        }
    }
}
