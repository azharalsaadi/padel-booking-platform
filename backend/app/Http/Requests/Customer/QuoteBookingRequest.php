<?php

namespace App\Http\Requests\Customer;

use App\Http\Requests\Concerns\ValidatesSlotSelection;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class QuoteBookingRequest extends FormRequest
{
    use ValidatesSlotSelection;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->slotFieldRules();
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $validator) => $this->validateSlotSelection($validator));
    }
}
