<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminBookingIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * All 5 mandatory filters (court, date, status, payment method, phone)
     * plus booking_reference search — locked in an earlier, already
     * approved phase ("admins can search bookings by booking_reference").
     */
    public function rules(): array
    {
        return [
            'court_id' => ['nullable', 'integer', 'exists:courts,id'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'status' => ['nullable', Rule::in(['pending_payment', 'confirmed', 'cancelled', 'expired'])],
            'payment_method' => ['nullable', Rule::in(['pay_at_venue', 'thawani'])],
            'payment_status' => ['nullable', Rule::in(['pending', 'paid', 'failed', 'expired', 'refunded', 'cancelled'])],
            'phone' => ['nullable', 'string', 'max:20'],
            'reference' => ['nullable', 'string', 'max:30'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
