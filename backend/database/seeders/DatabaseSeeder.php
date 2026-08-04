<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed demo/testing data. Order matters: courts before working hours
     * and closures, admin before pricing rules (for created_by), courts
     * and pricing rules before bookings.
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            CourtSeeder::class,
            PricingRuleSeeder::class,
            CourtClosureSeeder::class,
            BookingSeeder::class,
        ]);
    }
}
