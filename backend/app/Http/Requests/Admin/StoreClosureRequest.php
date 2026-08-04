<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClosureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * court_ids omitted/null means "all courts". dates.mode selects which
     * of values/range is required — matches the frozen architecture's
     * closure contract exactly.
     */
    public function rules(): array
    {
        return [
            // Bounded (Step 17 hardening): ClosureService::create() expands
            // court_ids x dates.values as a cross-product with no cap of its
            // own, so an unbounded array here means an unbounded number of
            // rows created by one request. 50 courts and 100 scattered
            // dates each comfortably exceed any real club's needs — a
            // longer span belongs in 'range' mode, which stores one row
            // per court regardless of how many days it spans.
            'court_ids' => ['nullable', 'array', 'min:1', 'max:50'],
            'court_ids.*' => ['integer', 'distinct', 'exists:courts,id'],

            'dates' => ['required', 'array'],
            'dates.mode' => ['required', Rule::in(['single', 'multiple', 'range'])],
            'dates.values' => ['required_if:dates.mode,single,multiple', 'array', 'min:1', 'max:100'],
            'dates.values.*' => ['date_format:Y-m-d'],
            'dates.range' => ['required_if:dates.mode,range', 'array'],
            'dates.range.start' => ['required_if:dates.mode,range', 'date_format:Y-m-d'],
            'dates.range.end' => ['required_if:dates.mode,range', 'date_format:Y-m-d', 'after_or_equal:dates.range.start'],

            'is_full_day' => ['required', 'boolean'],
            // 'nullable' is required here, not just cosmetic: required_if
            // only controls whether the field is REQUIRED — it does not
            // exempt a null value from date_format/after once is_full_day
            // is true. Without 'nullable', the frontend's is_full_day=true
            // payload (which explicitly sends start_time/end_time as null,
            // not omitted) fails date_format against null every time.
            'start_time' => ['nullable', 'required_if:is_full_day,false', 'date_format:H:i'],
            'end_time' => ['nullable', 'required_if:is_full_day,false', 'date_format:H:i', 'after:start_time'],

            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
