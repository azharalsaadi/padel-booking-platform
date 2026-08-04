<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'method' => PaymentMethod::PayAtVenue,
            'status' => PaymentStatus::Pending,
            'amount_baisa' => 10000,
            'currency' => 'OMR',
        ];
    }
}
