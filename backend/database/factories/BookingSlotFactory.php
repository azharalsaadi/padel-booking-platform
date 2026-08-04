<?php

namespace Database\Factories;

use App\Enums\BookingSlotStatus;
use App\Models\Booking;
use App\Models\Court;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingSlotFactory extends Factory
{
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'court_id' => Court::factory(),
            'date' => now()->addDays(3)->toDateString(),
            'start_time' => '18:00:00',
            'end_time' => '19:00:00',
            'price_baisa' => 10000,
            'status' => BookingSlotStatus::Confirmed,
        ];
    }
}
