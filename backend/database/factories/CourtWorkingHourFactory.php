<?php

namespace Database\Factories;

use App\Models\Court;
use Illuminate\Database\Eloquent\Factories\Factory;

class CourtWorkingHourFactory extends Factory
{
    public function definition(): array
    {
        return [
            'court_id' => Court::factory(),
            'day_of_week' => fake()->numberBetween(0, 6),
            'open_time' => '06:00:00',
            'close_time' => '23:00:00',
        ];
    }
}
