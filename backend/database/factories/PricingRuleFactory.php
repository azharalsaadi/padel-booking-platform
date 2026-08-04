<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PricingRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'hours_from' => 1,
            'hours_to' => 1,
            'price_per_hour_baisa' => 10000,
            'is_active' => true,
            'created_by' => null,
        ];
    }
}
