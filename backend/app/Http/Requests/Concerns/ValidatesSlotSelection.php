<?php

namespace App\Http\Requests\Concerns;

use Carbon\Carbon;
use Illuminate\Contracts\Validation\Validator;

/**
 * Shared 60-minute-slot-selection validation, used by both the quote
 * endpoint (Step 8) and the booking creation endpoint (Step 9) so the two
 * never drift apart.
 */
trait ValidatesSlotSelection
{
    protected function slotFieldRules(): array
    {
        return [
            'slots' => ['required', 'array', 'min:1'],
            'slots.*.date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'slots.*.start_time' => ['required', 'date_format:H:i'],
            'slots.*.end_time' => ['required', 'date_format:H:i', 'after:slots.*.start_time'],
        ];
    }

    /**
     * Field-level rules above can't express "exactly 60 minutes", "no
     * duplicate (date, start_time) pairs", or "not already in the past for
     * today" — those need whole-array context, so they're checked here.
     */
    protected function validateSlotSelection(Validator $validator): void
    {
        $slots = $this->input('slots', []);

        if (! is_array($slots)) {
            return;
        }

        $seen = [];
        $today = Carbon::now()->toDateString();
        $now = Carbon::now()->format('H:i');

        foreach ($slots as $index => $slot) {
            if (! isset($slot['date'], $slot['start_time'], $slot['end_time'])) {
                continue; // already reported by the field rules above
            }

            $start = $this->tryParseSlotTime($slot['start_time']);
            $end = $this->tryParseSlotTime($slot['end_time']);

            // Exact equality rather than diffInMinutes(): Carbon 3 returns
            // a float, and float 60.0 !== int 60 under strict comparison.
            if ($start !== null && $end !== null && ! $start->copy()->addMinutes(60)->equalTo($end)) {
                $validator->errors()->add(
                    "slots.{$index}.end_time",
                    'Each slot must be exactly 60 minutes.'
                );
            }

            if ($slot['date'] === $today && $slot['start_time'] <= $now) {
                $validator->errors()->add(
                    "slots.{$index}.start_time",
                    'This slot has already passed.'
                );
            }

            $key = $slot['date'].'|'.$slot['start_time'];
            if (isset($seen[$key])) {
                $validator->errors()->add("slots.{$index}", 'Duplicate slot selected.');
            } else {
                $seen[$key] = true;
            }
        }
    }

    private function tryParseSlotTime(mixed $value): ?Carbon
    {
        if (! is_string($value)) {
            return null;
        }

        try {
            return Carbon::createFromFormat('H:i', $value);
        } catch (\Throwable) {
            return null;
        }
    }
}
