<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CourtClosureFactory extends Factory
{
    public function definition(): array
    {
        return [
            'batch_id' => null,
            'court_id' => null,
            'date_start' => now()->addDays(5)->toDateString(),
            'date_end' => now()->addDays(5)->toDateString(),
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => fake()->optional()->sentence(),
            'created_by' => null,
        ];
    }
}
