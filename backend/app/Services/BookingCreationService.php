<?php

namespace App\Services;

use App\Enums\BookingSlotStatus;
use App\Enums\BookingStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\Booking\SlotConflictException;
use App\Models\Booking;
use App\Models\BookingSlot;
use App\Models\Payment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Orchestrates the entire booking-creation transaction. Never trusts the
 * earlier /bookings/quote call — pricing and availability are both
 * recalculated fresh, inside the same transaction as the allocation and
 * persistence, so the whole operation succeeds or fails atomically.
 */
class BookingCreationService
{
    public function __construct(
        private readonly PricingService $pricingService,
        private readonly BookingAllocationService $allocationService,
        private readonly PaymentService $paymentService,
    ) {}

    /**
     * @param  array{
     *     customer_phone: string,
     *     customer_name: ?string,
     *     customer_email: ?string,
     *     notes: ?string,
     *     payment_method: string,
     *     slots: array<int, array{date: string, start_time: string, end_time: string}>,
     * }  $data
     */
    public function create(array $data): Booking
    {
        $booking = DB::transaction(function () use ($data) {
            // Final, in-transaction allocation — throws SlotUnavailableException
            // if any requested slot has no free court right now.
            $assignments = $this->allocationService->allocate($data['slots']);

            // Recalculated fresh; the earlier quote (if any) is not trusted.
            $pricing = $this->pricingService->quote($data['slots']);

            $isThawani = $data['payment_method'] === PaymentMethod::Thawani->value;

            $booking = $this->persistBooking($data, $pricing, $isThawani);
            $this->persistSlots($booking, $assignments, $pricing);
            $this->persistPayment($booking, $data['payment_method'], $pricing['total_price_baisa']);

            return $booking->fresh(['bookingSlots']);
        });

        // Deliberately OUTSIDE the transaction above: an external HTTP call
        // must never hold a DB transaction (and its row locks) open. If
        // this fails, the booking still exists as pending_payment with no
        // checkout_url — a future retry endpoint re-issues the session.
        if ($booking->payment_method === PaymentMethod::Thawani) {
            $this->paymentService->issueCheckoutSession($booking);
        }

        return $booking->load('payments');
    }

    private function persistBooking(array $data, array $pricing, bool $isThawani): Booking
    {
        $booking = new Booking([
            'customer_phone' => $data['customer_phone'],
            // customer_name/customer_email/notes are validated as
            // 'nullable', not 'required' — validated() omits the key
            // entirely when a client sends no key at all (as opposed to an
            // explicit null), so raw array access here would throw.
            'customer_name' => $data['customer_name'] ?? null,
            'customer_email' => $data['customer_email'] ?? null,
            'notes' => $data['notes'] ?? null,
            'status' => $isThawani ? BookingStatus::PendingPayment : BookingStatus::Confirmed,
            'payment_method' => $data['payment_method'],
            'total_price_baisa' => $pricing['total_price_baisa'],
            'currency' => $pricing['currency'],
            'hold_expires_at' => $isThawani ? now()->addMinutes((int) config('booking.thawani_hold_minutes')) : null,
            'confirmed_at' => $isThawani ? null : now(),
        ]);

        // booking_reference/access_token are NOT NULL + unique and not mass
        // assignable (see Booking::$fillable) — booking_reference depends
        // on the row's own id, so it gets a temporary unique placeholder on
        // the first insert, then its final value once $id is known.
        $booking->booking_reference = 'TMP-'.Str::random(20);
        $booking->access_token = Str::random(64);
        $booking->save();

        $booking->booking_reference = sprintf('BK-%s-%06d', now()->format('Ymd'), $booking->id);
        $booking->save();

        return $booking;
    }

    /**
     * @param  array<int, array{date: string, start_time: string, end_time: string, court_id: int}>  $assignments
     */
    private function persistSlots(Booking $booking, array $assignments, array $pricing): void
    {
        // booking_slots.status mirrors its parent booking's status by design.
        $slotStatus = BookingSlotStatus::from($booking->status->value);
        $pricePerHourBaisa = $pricing['applied_rule']['price_per_hour_baisa'];

        try {
            foreach ($assignments as $assignment) {
                BookingSlot::create([
                    'booking_id' => $booking->id,
                    'court_id' => $assignment['court_id'],
                    'date' => $assignment['date'],
                    'start_time' => $assignment['start_time'],
                    'end_time' => $assignment['end_time'],
                    'price_baisa' => $pricePerHourBaisa,
                    'status' => $slotStatus,
                ]);
            }
        } catch (UniqueConstraintViolationException $e) {
            // The application-level locking in BookingAllocationService
            // should make this unreachable in practice — this is the
            // database's own lock_key backstop catching a race it missed.
            throw new SlotConflictException($e);
        }
    }

    private function persistPayment(Booking $booking, string $paymentMethod, int $amountBaisa): void
    {
        Payment::create([
            'booking_id' => $booking->id,
            'method' => $paymentMethod,
            'status' => PaymentStatus::Pending,
            'amount_baisa' => $amountBaisa,
            'currency' => $booking->currency,
        ]);
    }
}
