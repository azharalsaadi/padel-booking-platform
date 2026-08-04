<?php

namespace App\Console\Commands;

use App\Enums\BookingSlotStatus;
use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Covers abandoned Thawani checkouts: a booking that never received a
 * webhook (or whose webhook was lost) stays pending_payment forever
 * without this, silently blocking its slots. Also the safety net behind
 * AvailabilityService/BookingAllocationService's own live hold_expires_at
 * check — even if this command runs late, availability is never wrong,
 * only slower to formally close out.
 */
class ExpirePendingBookings extends Command
{
    protected $signature = 'bookings:expire-pending';

    protected $description = 'Expire pending_payment bookings whose Thawani hold has lapsed, freeing their slots.';

    public function handle(): int
    {
        $expiredCount = 0;

        Booking::query()
            ->where('status', BookingStatus::PendingPayment)
            ->whereNotNull('hold_expires_at')
            ->where('hold_expires_at', '<', now())
            ->chunkById(100, function ($bookings) use (&$expiredCount) {
                foreach ($bookings as $booking) {
                    DB::transaction(function () use ($booking) {
                        $fresh = Booking::whereKey($booking->id)->lockForUpdate()->first();

                        if ($fresh === null || $fresh->status !== BookingStatus::PendingPayment) {
                            return; // already resolved by a webhook in the meantime
                        }

                        $fresh->status = BookingStatus::Expired;
                        $fresh->save();

                        $fresh->bookingSlots()->update(['status' => BookingSlotStatus::Expired]);
                        $fresh->payments()
                            ->where('status', PaymentStatus::Pending)
                            ->update(['status' => PaymentStatus::Expired]);
                    });

                    $expiredCount++;
                }
            });

        $this->info("Expired {$expiredCount} pending booking(s).");

        return self::SUCCESS;
    }
}
