<?php

namespace App\Services;

use App\Exceptions\Pricing\InvalidSlotSelectionException;
use App\Exceptions\Pricing\NoMatchingPricingRuleException;
use App\Models\PricingRule;
use Carbon\Carbon;

/**
 * Pricing is global and based on the TOTAL hours across the whole booking
 * (every date combined), never per day — one tier applies uniformly to
 * every requested slot. Money is integer baisa throughout; nothing here
 * ever touches a float. Never trusts a caller-supplied hour count or
 * price — both are always derived from the slot list itself.
 */
class PricingService
{
    private const SLOT_MINUTES = 60;

    /**
     * @param  array<int, array{date: string, start_time: string, end_time: string}>  $slots
     * @return array{
     *     currency: string,
     *     total_hours: int,
     *     days: array<int, array{date: string, hours: int}>,
     *     standard_subtotal_baisa: int,
     *     applied_rule: array{hours_from: int, hours_to: ?int, price_per_hour_baisa: int},
     *     discount_baisa: int,
     *     total_price_baisa: int,
     * }
     *
     * @throws InvalidSlotSelectionException
     * @throws NoMatchingPricingRuleException
     */
    public function quote(array $slots): array
    {
        if (empty($slots)) {
            throw new InvalidSlotSelectionException('At least one slot is required.');
        }

        $normalized = $this->normalizeSlots($slots);
        $totalHours = count($normalized);

        $days = $this->groupHoursByDate($normalized);

        $appliedRule = $this->selectRuleForHours($totalHours);
        $baseRule = $this->selectRuleForHours(1);

        $standardSubtotalBaisa = $totalHours * $baseRule->price_per_hour_baisa;
        $totalPriceBaisa = $totalHours * $appliedRule->price_per_hour_baisa;
        $discountBaisa = $standardSubtotalBaisa - $totalPriceBaisa;

        return [
            'currency' => 'OMR',
            'total_hours' => $totalHours,
            'days' => $days,
            'standard_subtotal_baisa' => $standardSubtotalBaisa,
            'applied_rule' => [
                'hours_from' => $appliedRule->hours_from,
                'hours_to' => $appliedRule->hours_to,
                'price_per_hour_baisa' => $appliedRule->price_per_hour_baisa,
            ],
            'discount_baisa' => $discountBaisa,
            'total_price_baisa' => $totalPriceBaisa,
        ];
    }

    /**
     * Recomputes each slot's duration from its own start/end rather than
     * trusting the caller, and rejects duplicates — independent of
     * whatever the HTTP request layer already checked.
     *
     * @param  array<int, array{date: string, start_time: string, end_time: string}>  $slots
     * @return array<int, array{date: string, start_time: string, end_time: string}>
     */
    private function normalizeSlots(array $slots): array
    {
        $seen = [];
        $normalized = [];

        foreach ($slots as $slot) {
            $date = $slot['date'];
            $start = $slot['start_time'];
            $end = $slot['end_time'];

            $startCarbon = Carbon::createFromFormat('H:i', $start);
            $endCarbon = Carbon::createFromFormat('H:i', $end);

            // Exact equality check rather than diffInMinutes(): Carbon 3
            // returns a float from diff*() methods, and float 60.0 !== int
            // 60 under strict comparison — this sidesteps that entirely.
            if (! $startCarbon->copy()->addMinutes(self::SLOT_MINUTES)->equalTo($endCarbon)) {
                throw new InvalidSlotSelectionException(
                    "Slot on {$date} at {$start} must be exactly 60 minutes."
                );
            }

            $key = "{$date}|{$start}";

            if (isset($seen[$key])) {
                throw new InvalidSlotSelectionException(
                    "Duplicate slot selected: {$date} {$start}."
                );
            }

            $seen[$key] = true;
            $normalized[] = ['date' => $date, 'start_time' => $start, 'end_time' => $end];
        }

        return $normalized;
    }

    /**
     * @param  array<int, array{date: string, start_time: string, end_time: string}>  $slots
     * @return array<int, array{date: string, hours: int}>
     */
    private function groupHoursByDate(array $slots): array
    {
        $counts = [];

        foreach ($slots as $slot) {
            $counts[$slot['date']] = ($counts[$slot['date']] ?? 0) + 1;
        }

        ksort($counts);

        $days = [];
        foreach ($counts as $date => $hours) {
            $days[] = ['date' => $date, 'hours' => $hours];
        }

        return $days;
    }

    /**
     * Selects the active tier covering $hours. If more than one active
     * rule matches (invalid/overlapping admin data), resolves
     * deterministically rather than picking arbitrarily: the most
     * specific rule wins (highest hours_from), then the earliest-created
     * (lowest id) as a final tie-break. No priority column exists —
     * intentionally not added (see architecture notes).
     */
    private function selectRuleForHours(int $hours): PricingRule
    {
        $rule = PricingRule::query()
            ->where('is_active', true)
            ->where('hours_from', '<=', $hours)
            ->where(function ($query) use ($hours) {
                $query->whereNull('hours_to')->orWhere('hours_to', '>=', $hours);
            })
            ->orderByDesc('hours_from')
            ->orderBy('id')
            ->first();

        if ($rule === null) {
            throw new NoMatchingPricingRuleException(
                "No active pricing rule matches {$hours} hour(s)."
            );
        }

        return $rule;
    }
}
