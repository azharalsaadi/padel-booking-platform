<?php

namespace App\Services;

use App\Enums\BookingSlotStatus;
use App\Models\Court;
use App\Models\CourtClosure;
use App\Models\CourtWorkingHour;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Aggregates per-slot availability across all active courts for a single
 * date, without ever exposing which (or how many) courts are involved —
 * that filtering happens at the API resource layer, but the data this
 * service returns already contains no court identity, only a boolean.
 */
class AvailabilityService
{
    private const SLOT_MINUTES = 60;

    /**
     * Returns every 60-minute slot the union of active courts' working
     * hours could produce for the date, each with its own aggregated
     * `available` boolean (true if at least one active, non-closed,
     * non-booked court exists for that slot). Includes unavailable slots —
     * callers that only want bookable slots filter on `available`.
     *
     * @return array<int, array{date: string, start_time: string, end_time: string, available: bool}>
     */
    public function getSlotsForDate(string $date): array
    {
        $courtIds = Court::query()->where('is_active', true)->pluck('id');

        if ($courtIds->isEmpty()) {
            return [];
        }

        $dayOfWeek = Carbon::parse($date)->dayOfWeek;

        $workingHoursByCourt = $this->loadWorkingHours($courtIds, $dayOfWeek);
        $closuresByCourt = $this->loadClosures($courtIds, $date);
        $blockedSlots = $this->loadBlockedSlots($courtIds, $date);

        $availabilityByTime = []; // start_time (H:i:s) => bool, OR-aggregated across courts

        foreach ($courtIds as $courtId) {
            $hours = $workingHoursByCourt->get($courtId);

            if ($hours === null) {
                continue; // no working-hours row for this weekday = closed all day
            }

            foreach ($this->generateSlots($hours->open_time, $hours->close_time) as [$start, $end]) {
                $isClosed = $this->isClosedForSlot($closuresByCourt->get($courtId, collect()), $start, $end);
                $isBlocked = isset($blockedSlots["{$courtId}|{$start}"]);

                $courtAvailable = ! $isClosed && ! $isBlocked;

                $availabilityByTime[$start] = ($availabilityByTime[$start] ?? false) || $courtAvailable;
            }
        }

        return $this->buildResult($date, $availabilityByTime);
    }

    /**
     * Checks a set of requested (date, start_time) pairs against real-time
     * availability — without ever exposing court identity, since it's
     * built entirely on top of getSlotsForDate(). One query pass per
     * distinct date requested, not per slot. Used by the booking quote
     * endpoint to flag problems; it never reserves anything.
     *
     * @param  array<int, array{date: string, start_time: string}>  $slots
     * @return array{all_available: bool, unavailable: array<int, array{date: string, start_time: string}>}
     */
    public function checkSlotsAvailability(array $slots): array
    {
        $startTimesByDate = [];
        foreach ($slots as $slot) {
            $startTimesByDate[$slot['date']][] = $slot['start_time'];
        }

        $unavailable = [];

        foreach ($startTimesByDate as $date => $startTimes) {
            $availableStartTimes = [];
            foreach ($this->getSlotsForDate($date) as $slot) {
                if ($slot['available']) {
                    $availableStartTimes[$slot['start_time']] = true;
                }
            }

            foreach ($startTimes as $startTime) {
                if (! isset($availableStartTimes[$startTime])) {
                    $unavailable[] = ['date' => $date, 'start_time' => $startTime];
                }
            }
        }

        return [
            'all_available' => empty($unavailable),
            'unavailable' => $unavailable,
        ];
    }

    /**
     * @param  Collection<int, int>  $courtIds
     * @return Collection<int, CourtWorkingHour> keyed by court_id
     */
    private function loadWorkingHours(Collection $courtIds, int $dayOfWeek): Collection
    {
        return CourtWorkingHour::query()
            ->whereIn('court_id', $courtIds)
            ->where('day_of_week', $dayOfWeek)
            ->get(['court_id', 'open_time', 'close_time'])
            ->keyBy('court_id');
    }

    /**
     * @param  Collection<int, int>  $courtIds
     * @return Collection<int, Collection<int, CourtClosure>> keyed by court_id
     */
    private function loadClosures(Collection $courtIds, string $date): Collection
    {
        $closures = CourtClosure::query()
            ->where('date_start', '<=', $date)
            ->where('date_end', '>=', $date)
            ->where(function ($query) use ($courtIds) {
                $query->whereNull('court_id')->orWhereIn('court_id', $courtIds);
            })
            ->get(['court_id', 'is_full_day', 'start_time', 'end_time']);

        $byCourt = $courtIds->mapWithKeys(fn ($id) => [$id => collect()]);

        foreach ($closures as $closure) {
            if ($closure->court_id === null) {
                foreach ($courtIds as $id) {
                    $byCourt[$id]->push($closure);
                }
            } else {
                $byCourt[$closure->court_id]?->push($closure);
            }
        }

        return $byCourt;
    }

    /**
     * Booking slots that actively block a court/time: confirmed always
     * blocks; pending_payment blocks only while its parent booking's
     * hold_expires_at is still in the future — a hold that has lapsed
     * (even if the expiry job hasn't run yet) must not hide availability.
     *
     * @param  Collection<int, int>  $courtIds
     * @return array<string, true> keyed by "{court_id}|{start_time}"
     */
    private function loadBlockedSlots(Collection $courtIds, string $date): array
    {
        $rows = DB::table('booking_slots')
            ->join('bookings', 'bookings.id', '=', 'booking_slots.booking_id')
            ->whereIn('booking_slots.court_id', $courtIds)
            ->where('booking_slots.date', $date)
            ->whereIn('booking_slots.status', [
                BookingSlotStatus::Confirmed->value,
                BookingSlotStatus::PendingPayment->value,
            ])
            ->select([
                'booking_slots.court_id',
                'booking_slots.start_time',
                'booking_slots.status',
                'bookings.hold_expires_at',
            ])
            ->get();

        $blocked = [];

        foreach ($rows as $row) {
            $blocks = $row->status === BookingSlotStatus::Confirmed->value
                || ($row->status === BookingSlotStatus::PendingPayment->value
                    && $row->hold_expires_at !== null
                    && Carbon::parse($row->hold_expires_at)->isFuture());

            if ($blocks) {
                $blocked["{$row->court_id}|{$row->start_time}"] = true;
            }
        }

        return $blocked;
    }

    /**
     * @return array<int, array{0: string, 1: string}> pairs of [start_time, end_time] as H:i:s
     */
    private function generateSlots(string $openTime, string $closeTime): array
    {
        $slots = [];
        $start = CarbonImmutable::createFromFormat('H:i:s', $openTime);
        $close = CarbonImmutable::createFromFormat('H:i:s', $closeTime);

        while (true) {
            // CarbonImmutable methods return new instances rather than
            // mutating in place, so the advanced value must be captured
            // and reassigned explicitly each iteration.
            $end = $start->addMinutes(self::SLOT_MINUTES);

            if ($end->gt($close)) {
                break;
            }

            $slots[] = [$start->format('H:i:s'), $end->format('H:i:s')];
            $start = $end;
        }

        return $slots;
    }

    /**
     * @param  Collection<int, CourtClosure>  $closures
     */
    private function isClosedForSlot(Collection $closures, string $slotStart, string $slotEnd): bool
    {
        foreach ($closures as $closure) {
            if ($closure->is_full_day) {
                return true;
            }

            // Half-open interval overlap: touching exactly at a boundary is not an overlap.
            if ($slotStart < $closure->end_time && $slotEnd > $closure->start_time) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, bool>  $availabilityByTime
     * @return array<int, array{date: string, start_time: string, end_time: string, available: bool}>
     */
    private function buildResult(string $date, array $availabilityByTime): array
    {
        ksort($availabilityByTime);

        $isToday = $date === Carbon::now()->toDateString();
        $now = Carbon::now()->format('H:i:s');

        $result = [];

        foreach ($availabilityByTime as $start => $available) {
            if ($isToday && $start <= $now) {
                continue; // past (or currently starting) slots on today are never returned
            }

            $end = CarbonImmutable::createFromFormat('H:i:s', $start)->addMinutes(self::SLOT_MINUTES);

            $result[] = [
                'date' => $date,
                'start_time' => substr($start, 0, 5),
                'end_time' => $end->format('H:i'),
                'available' => $available,
            ];
        }

        return $result;
    }
}
