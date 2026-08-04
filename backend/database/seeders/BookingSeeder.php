<?php

namespace Database\Seeders;

use App\Enums\BookingSlotStatus;
use App\Enums\BookingStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Court;
use App\Models\Payment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BookingSeeder extends Seeder
{
    /**
     * Demo bookings covering every required scenario: pay-at-venue confirmed,
     * Thawani pending, Thawani paid, multi-hour, multi-day, and one
     * cancelled + one expired booking for historical/status filtering.
     *
     * Court/date/time combinations are chosen by hand (not randomly, since
     * the real random-allocation algorithm arrives in Step 9) to guarantee
     * no lock_key collisions while keeping the demo data readable.
     */
    public function run(): void
    {
        $court1 = Court::where('name', 'Court 1')->firstOrFail();
        $court2 = Court::where('name', 'Court 2')->firstOrFail();
        $court3 = Court::where('name', 'Court 3')->firstOrFail();

        // 1. Pay-at-venue, confirmed, single hour.
        $this->makeBooking(
            phone: '+96891112221',
            name: 'Ahmed Al Balushi',
            email: null,
            status: BookingStatus::Confirmed,
            paymentMethod: PaymentMethod::PayAtVenue,
            slots: [
                ['court' => $court1, 'date' => now()->addDays(1), 'start' => '18:00:00', 'end' => '19:00:00', 'price' => 10000, 'status' => BookingSlotStatus::Confirmed],
            ],
            payment: ['status' => PaymentStatus::Pending],
        );

        // 2. Thawani, pending_payment (slot held, awaiting checkout completion).
        $this->makeBooking(
            phone: '+96892223332',
            name: null,
            email: 'sara@example.com',
            status: BookingStatus::PendingPayment,
            paymentMethod: PaymentMethod::Thawani,
            slots: [
                ['court' => $court2, 'date' => now()->addDays(2), 'start' => '19:00:00', 'end' => '20:00:00', 'price' => 10000, 'status' => BookingSlotStatus::PendingPayment],
            ],
            payment: [
                'status' => PaymentStatus::Pending,
                'thawani_session_id' => 'checkout_demo_pending_0001',
                'checkout_url' => 'https://uatcheckout.thawani.om/pay/checkout_demo_pending_0001',
            ],
            holdExpiresAt: now()->addMinutes(10),
        );

        // 3. Thawani, confirmed + paid.
        $this->makeBooking(
            phone: '+96893334443',
            name: 'Fatma Al Harthy',
            email: null,
            status: BookingStatus::Confirmed,
            paymentMethod: PaymentMethod::Thawani,
            slots: [
                ['court' => $court3, 'date' => now()->addDays(2), 'start' => '18:00:00', 'end' => '19:00:00', 'price' => 10000, 'status' => BookingSlotStatus::Confirmed],
            ],
            payment: [
                'status' => PaymentStatus::Paid,
                'thawani_session_id' => 'checkout_demo_paid_0002',
                'thawani_payment_id' => 'payment_demo_0002',
                'paid_at' => now()->subHours(2),
            ],
            confirmedAt: now()->subHours(2),
        );

        // 4. Multi-hour: 3 consecutive hours in one day -> the 3+ hour tier (7.000 OMR/hr).
        $this->makeBooking(
            phone: '+96894445554',
            name: 'Yousuf Al Kindi',
            email: null,
            status: BookingStatus::Confirmed,
            paymentMethod: PaymentMethod::PayAtVenue,
            slots: [
                ['court' => $court1, 'date' => now()->addDays(4), 'start' => '18:00:00', 'end' => '19:00:00', 'price' => 7000, 'status' => BookingSlotStatus::Confirmed],
                ['court' => $court1, 'date' => now()->addDays(4), 'start' => '19:00:00', 'end' => '20:00:00', 'price' => 7000, 'status' => BookingSlotStatus::Confirmed],
                ['court' => $court1, 'date' => now()->addDays(4), 'start' => '20:00:00', 'end' => '21:00:00', 'price' => 7000, 'status' => BookingSlotStatus::Confirmed],
            ],
            payment: ['status' => PaymentStatus::Pending],
        );

        // 5. Multi-day: 1 hour on each of two different dates in the SAME booking
        //    -> total 2 hours across the booking -> the 2-hour tier (8.000 OMR/hr).
        $this->makeBooking(
            phone: '+96895556665',
            name: null,
            email: null,
            status: BookingStatus::Confirmed,
            paymentMethod: PaymentMethod::Thawani,
            slots: [
                ['court' => $court2, 'date' => now()->addDays(5), 'start' => '20:00:00', 'end' => '21:00:00', 'price' => 8000, 'status' => BookingSlotStatus::Confirmed],
                ['court' => $court2, 'date' => now()->addDays(6), 'start' => '20:00:00', 'end' => '21:00:00', 'price' => 8000, 'status' => BookingSlotStatus::Confirmed],
            ],
            payment: [
                'status' => PaymentStatus::Paid,
                'thawani_session_id' => 'checkout_demo_paid_0003',
                'thawani_payment_id' => 'payment_demo_0003',
                'paid_at' => now()->subDay(),
            ],
            confirmedAt: now()->subDay(),
        );

        // 6. Cancelled booking (historical filtering).
        $this->makeBooking(
            phone: '+96896667776',
            name: 'Mariam Al Saidi',
            email: null,
            status: BookingStatus::Cancelled,
            paymentMethod: PaymentMethod::PayAtVenue,
            slots: [
                ['court' => $court3, 'date' => now()->addDays(1), 'start' => '19:00:00', 'end' => '20:00:00', 'price' => 10000, 'status' => BookingSlotStatus::Cancelled],
            ],
            payment: ['status' => PaymentStatus::Cancelled],
            cancelledAt: now()->subHour(),
            cancellationReason: 'Customer requested cancellation',
        );

        // 7. Expired booking: Thawani hold that timed out unpaid (historical filtering).
        $this->makeBooking(
            phone: '+96897778887',
            name: null,
            email: null,
            status: BookingStatus::Expired,
            paymentMethod: PaymentMethod::Thawani,
            slots: [
                ['court' => $court1, 'date' => now()->addDays(2), 'start' => '20:00:00', 'end' => '21:00:00', 'price' => 10000, 'status' => BookingSlotStatus::Expired],
            ],
            payment: [
                'status' => PaymentStatus::Expired,
                'thawani_session_id' => 'checkout_demo_expired_0004',
            ],
            holdExpiresAt: now()->subMinutes(5),
        );
    }

    /**
     * @param  array<int, array{court: Court, date: \Illuminate\Support\Carbon, start: string, end: string, price: int, status: BookingSlotStatus}>  $slots
     * @param  array{status: PaymentStatus, thawani_session_id?: string, thawani_payment_id?: string, checkout_url?: string, paid_at?: \Illuminate\Support\Carbon}  $payment
     */
    private function makeBooking(
        ?string $phone,
        ?string $name,
        ?string $email,
        BookingStatus $status,
        PaymentMethod $paymentMethod,
        array $slots,
        array $payment,
        ?\Illuminate\Support\Carbon $holdExpiresAt = null,
        ?\Illuminate\Support\Carbon $confirmedAt = null,
        ?\Illuminate\Support\Carbon $cancelledAt = null,
        ?string $cancellationReason = null,
    ): Booking {
        $totalPriceBaisa = array_sum(array_column($slots, 'price'));

        $booking = new Booking([
            'customer_phone' => $phone,
            'customer_name' => $name,
            'customer_email' => $email,
            'notes' => null,
            'status' => $status,
            'payment_method' => $paymentMethod,
            'total_price_baisa' => $totalPriceBaisa,
            'currency' => 'OMR',
            'hold_expires_at' => $holdExpiresAt,
            'confirmed_at' => $confirmedAt,
            'cancelled_at' => $cancelledAt,
            'cancellation_reason' => $cancellationReason,
        ]);

        // booking_reference / access_token are backend-generated, not mass
        // assignable (see Booking::$fillable), and NOT NULL + unique — so a
        // real value must exist on the first insert. access_token doesn't
        // depend on the row's id, but booking_reference does, so it gets a
        // temporary unique placeholder here and its final value once $id is
        // known. The real BookingReferenceGenerator (Step 9) faces the same
        // constraint and will use the same two-step pattern.
        $booking->booking_reference = 'TMP-' . Str::random(20);
        $booking->access_token = Str::random(64);
        $booking->save();

        $booking->booking_reference = sprintf('BK-%s-%06d', now()->format('Ymd'), $booking->id);
        $booking->save();

        foreach ($slots as $slot) {
            BookingSlot::create([
                'booking_id' => $booking->id,
                'court_id' => $slot['court']->id,
                'date' => $slot['date']->toDateString(),
                'start_time' => $slot['start'],
                'end_time' => $slot['end'],
                'price_baisa' => $slot['price'],
                'status' => $slot['status'],
            ]);
        }

        $paymentRecord = Payment::create([
            'booking_id' => $booking->id,
            'method' => $paymentMethod,
            'status' => $payment['status'],
            'amount_baisa' => $totalPriceBaisa,
            'currency' => 'OMR',
        ]);

        // Gateway-derived fields are excluded from Payment::$fillable —
        // set directly, mirroring how PaymentService (Step 10) will.
        foreach (['thawani_session_id', 'thawani_payment_id', 'checkout_url', 'paid_at'] as $field) {
            if (array_key_exists($field, $payment)) {
                $paymentRecord->{$field} = $payment[$field];
            }
        }
        $paymentRecord->save();

        return $booking;
    }
}
