<?php

namespace App\Services;

use App\Enums\BookingSlotStatus;
use App\Exceptions\Booking\SlotUnavailableException;
use App\Models\Court;
use App\Models\CourtClosure;
use App\Models\CourtWorkingHour;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Race-safe, random court allocation. MUST be called from inside an
 * already-open DB transaction (BookingCreationService owns the
 * transaction boundary) — this service assumes the caller will commit or
 * roll back around it.
 *
 * Locking strategy: SELECT ... FOR UPDATE on the candidate `courts` rows
 * serializes concurrent allocation attempts. Because booking_slots.court_id
 * carries a foreign key to courts, InnoDB takes an implicit shared lock on
 * the referenced court row for every booking_slots INSERT — so a second
 * transaction trying to book any of the same courts blocks until this one
 * commits or rolls back, at which point it re-reads the now-current state.
 * The booking_slots.lock_key unique index remains the final backstop if
 * that ever gets bypassed (e.g. a bug in this service).
 */
class BookingAllocationService
{
    /**
     * @param  array<int, array{date: string, start_time: string, end_time: string}>  $slots
     * @return array<int, array{date: string, start_time: string, end_time: string, court_id: int}>
     *
     * @throws SlotUnavailableException
     */
    public function allocate(array $slots): array
    {
        // Locks every active court row for the remainder of this
        // transaction — the actual serialization point (see class docblock).
        $courtIds = Court::query()->where('is_active', true)->lockForUpdate()->pluck('id');

        if ($courtIds->isEmpty()) {
            throw new SlotUnavailableException($this->asUnavailable($slots));
        }

        $dates = collect($slots)->pluck('date')->unique()->values();
        $dayOfWeeks = $dates->mapWithKeys(fn ($date) => [$date => Carbon::parse($date)->dayOfWeek]);

        $workingHours = $this->loadWorkingHours($courtIds, $dayOfWeeks->unique()->values());
        $closuresByCourt = $this->loadClosures($courtIds, $dates);
        $blocked = $this->loadBlockedSlots($courtIds, $dates);

        $runs = $this->groupIntoContiguousRuns($slots);

        $assignments = [];
        $unavailable = [];

        foreach ($runs as $run) {
            $courtsFreeForWholeRun = $courtIds->filter(
                fn ($courtId) => collect($run)->every(
                    fn ($slot) => $this->isCourtFree($courtId, $slot, $workingHours, $dayOfWeeks, $closuresByCourt, $blocked)
                )
            )->values();

            if ($courtsFreeForWholeRun->isNotEmpty()) {
                $chosenCourtId = $courtsFreeForWholeRun[array_rand($courtsFreeForWholeRun->all())];

                foreach ($run as $slot) {
                    $assignments[] = [...$slot, 'court_id' => $chosenCourtId];
                    $blocked["{$chosenCourtId}|{$slot['date']}|{$slot['start_time']}:00"] = true;
                }

                continue;
            }

            // Pass 2 fallback: no single court covers the whole run —
            // assign each slot in the run independently and randomly.
            foreach ($run as $slot) {
                $freeCourts = $courtIds->filter(
                    fn ($courtId) => $this->isCourtFree($courtId, $slot, $workingHours, $dayOfWeeks, $closuresByCourt, $blocked)
                )->values();

                if ($freeCourts->isEmpty()) {
                    $unavailable[] = $slot;

                    continue;
                }

                $chosenCourtId = $freeCourts[array_rand($freeCourts->all())];
                $assignments[] = [...$slot, 'court_id' => $chosenCourtId];
                $blocked["{$chosenCourtId}|{$slot['date']}|{$slot['start_time']}:00"] = true;
            }
        }

        if (! empty($unavailable)) {
            throw new SlotUnavailableException($unavailable);
        }

        return $assignments;
    }

    /**
     * Splits requested slots into runs of contiguous hours: same date, and
     * each slot's start_time equal to the previous slot's end_time. A gap
     * (non-consecutive) or a date change starts a new run.
     *
     * @param  array<int, array{date: string, start_time: string, end_time: string}>  $slots
     * @return array<int, array<int, array{date: string, start_time: string, end_time: string}>>
     */
    private function groupIntoContiguousRuns(array $slots): array
    {
        $sorted = $slots;
        usort($sorted, fn ($a, $b) => [$a['date'], $a['start_time']] <=> [$b['date'], $b['start_time']]);

        $runs = [];
        $current = [];

        foreach ($sorted as $slot) {
            if (empty($current)) {
                $current[] = $slot;

                continue;
            }

            $last = end($current);

            if ($slot['date'] === $last['date'] && $slot['start_time'] === $last['end_time']) {
                $current[] = $slot;
            } else {
                $runs[] = $current;
                $current = [$slot];
            }
        }

        if (! empty($current)) {
            $runs[] = $current;
        }

        return $runs;
    }

    private function isCourtFree(
        int $courtId,
        array $slot,
        Collection $workingHours,
        Collection $dayOfWeeks,
        Collection $closuresByCourt,
        array $blocked,
    ): bool {
        $dayOfWeek = $dayOfWeeks[$slot['date']];
        $hours = $workingHours->get("{$courtId}|{$dayOfWeek}");

        if ($hours === null) {
            return false; // closed that weekday
        }

        $start = $slot['start_time'].':00';
        $end = $slot['end_time'].':00';

        if ($start < $hours->open_time || $end > $hours->close_time) {
            return false; // outside working hours
        }

        foreach ($closuresByCourt->get($courtId, collect()) as $closure) {
            if ($closure->date_start->toDateString() > $slot['date'] || $closure->date_end->toDateString() < $slot['date']) {
                continue;
            }

            if ($closure->is_full_day) {
                return false;
            }

            if ($start < $closure->end_time && $end > $closure->start_time) {
                return false;
            }
        }

        // $start is already normalized to H:i:s, matching the DB-derived
        // keys built in loadBlockedSlots() — $slot['start_time'] alone is
        // H:i and would never match.
        return ! isset($blocked["{$courtId}|{$slot['date']}|{$start}"]);
    }

    /**
     * @param  Collection<int, int>  $courtIds
     * @param  Collection<int, int>  $dayOfWeeks  distinct day-of-week values needed
     * @return Collection<string, CourtWorkingHour> keyed by "{court_id}|{day_of_week}"
     */
    private function loadWorkingHours(Collection $courtIds, Collection $dayOfWeeks): Collection
    {
        return CourtWorkingHour::query()
            ->whereIn('court_id', $courtIds)
            ->whereIn('day_of_week', $dayOfWeeks)
            ->get(['court_id', 'day_of_week', 'open_time', 'close_time'])
            ->keyBy(fn ($row) => "{$row->court_id}|{$row->day_of_week}");
    }

    /**
     * @param  Collection<int, int>  $courtIds
     * @param  Collection<int, string>  $dates
     * @return Collection<int, Collection<int, CourtClosure>> keyed by court_id
     */
    private function loadClosures(Collection $courtIds, Collection $dates): Collection
    {
        $minDate = $dates->min();
        $maxDate = $dates->max();

        $closures = CourtClosure::query()
            ->where('date_start', '<=', $maxDate)
            ->where('date_end', '>=', $minDate)
            ->where(function ($query) use ($courtIds) {
                $query->whereNull('court_id')->orWhereIn('court_id', $courtIds);
            })
            ->get(['court_id', 'date_start', 'date_end', 'is_full_day', 'start_time', 'end_time']);

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
     * Locking read: reads the latest committed state (bypassing any
     * snapshot), which is what makes this correct once the court-row locks
     * above have serialized access.
     *
     * @param  Collection<int, int>  $courtIds
     * @param  Collection<int, string>  $dates
     * @return array<string, true> keyed by "{court_id}|{date}|{start_time}"
     */
    private function loadBlockedSlots(Collection $courtIds, Collection $dates): array
    {
        $rows = DB::table('booking_slots')
            ->join('bookings', 'bookings.id', '=', 'booking_slots.booking_id')
            ->whereIn('booking_slots.court_id', $courtIds)
            ->whereIn('booking_slots.date', $dates)
            ->whereIn('booking_slots.status', [
                BookingSlotStatus::Confirmed->value,
                BookingSlotStatus::PendingPayment->value,
            ])
            ->select([
                'booking_slots.court_id',
                'booking_slots.date',
                'booking_slots.start_time',
                'booking_slots.status',
                'bookings.hold_expires_at',
            ])
            ->lockForUpdate()
            ->get();

        $blocked = [];

        foreach ($rows as $row) {
            $blocks = $row->status === BookingSlotStatus::Confirmed->value
                || ($row->status === BookingSlotStatus::PendingPayment->value
                    && $row->hold_expires_at !== null
                    && Carbon::parse($row->hold_expires_at)->isFuture());

            if ($blocks) {
                $date = $row->date instanceof \DateTimeInterface ? $row->date->format('Y-m-d') : substr((string) $row->date, 0, 10);
                $blocked["{$row->court_id}|{$date}|{$row->start_time}"] = true;
            }
        }

        return $blocked;
    }

    /**
     * @param  array<int, array{date: string, start_time: string, end_time: string}>  $slots
     * @return array<int, array{date: string, start_time: string, end_time: string}>
     */
    private function asUnavailable(array $slots): array
    {
        return array_map(
            fn (array $slot) => ['date' => $slot['date'], 'start_time' => $slot['start_time'], 'end_time' => $slot['end_time']],
            $slots
        );
    }
}
