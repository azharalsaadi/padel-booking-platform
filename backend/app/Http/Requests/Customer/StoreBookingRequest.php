<?php

namespace App\Http\Requests\Customer;

use App\Http\Requests\Concerns\ValidatesSlotSelection;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    use ValidatesSlotSelection;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * Deliberately does NOT accept court_id, court name, booking status,
     * payment status, total_hours, total_price, slot price,
     * booking_reference, or access_token — every one of those is either
     * generated or recalculated server-side in BookingCreationService.
     * Anything else the client sends is simply not read.
     */
    public function rules(): array
    {
        return array_merge($this->slotFieldRules(), [
            'customer_phone' => ['required', 'string', 'regex:/^\+968\d{8}$/'],
            'customer_name' => ['nullable', 'string', 'max:120'],
            'customer_email' => ['nullable', 'email', 'max:190'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['required', 'string', 'in:pay_at_venue,thawani'],
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $validator) => $this->validateSlotSelection($validator));
    }
}
