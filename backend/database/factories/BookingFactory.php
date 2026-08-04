<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class BookingFactory extends Factory
{
    public function definition(): array
    {
        return [
            // Factories run inside Model::unguarded(), so these non-fillable,
            // backend-generated fields can still be set here for test fixtures.
            'booking_reference' => 'BK-' . now()->format('Ymd') . '-' . fake()->unique()->numerify('######'),
            'access_token' => Str::random(64),
            'customer_phone' => '+968' . fake()->numerify('########'),
            'customer_name' => fake()->optional()->name(),
            'customer_email' => fake()->optional()->safeEmail(),
            'notes' => null,
            'status' => BookingStatus::Confirmed,
            'payment_method' => PaymentMethod::PayAtVenue,
            'total_price_baisa' => 10000,
            'currency' => 'OMR',
        ];
    }
}
