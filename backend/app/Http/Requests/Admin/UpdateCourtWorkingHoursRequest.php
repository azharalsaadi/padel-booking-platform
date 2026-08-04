<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateCourtWorkingHoursRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Fewer than 7 entries is valid and intentional — a day with no entry
     * means the court is closed that weekday (the established convention).
     */
    public function rules(): array
    {
        return [
            'working_hours' => ['present', 'array', 'max:7'],
            'working_hours.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'working_hours.*.open_time' => ['required', 'date_format:H:i'],
            'working_hours.*.close_time' => ['required', 'date_format:H:i', 'after:working_hours.*.open_time'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $hours = $this->input('working_hours', []);

            if (! is_array($hours)) {
                return;
            }

            $days = array_column($hours, 'day_of_week');

            if (count($days) !== count(array_unique($days))) {
                $validator->errors()->add('working_hours', 'Each day_of_week may only appear once.');
            }
        });
    }
}
