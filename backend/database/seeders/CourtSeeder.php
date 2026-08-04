<?php

namespace Database\Seeders;

use App\Models\Court;
use Illuminate\Database\Seeder;

class CourtSeeder extends Seeder
{
    /**
     * day_of_week: 0 = Sunday .. 6 = Saturday (matches court_working_hours migration).
     * Demo schedule: Sun-Thu 16:00-23:00, Fri-Sat 14:00-23:00 (Oman weekend).
     */
    private const SUN_THU = [0, 1, 2, 3, 4];

    private const FRI_SAT = [5, 6];

    public function run(): void
    {
        foreach (['Court 1', 'Court 2', 'Court 3'] as $index => $name) {
            $court = Court::updateOrCreate(
                ['name' => $name],
                ['is_active' => true, 'sort_order' => $index + 1]
            );

            foreach (self::SUN_THU as $day) {
                $court->workingHours()->updateOrCreate(
                    ['day_of_week' => $day],
                    ['open_time' => '16:00:00', 'close_time' => '23:00:00']
                );
            }

            foreach (self::FRI_SAT as $day) {
                $court->workingHours()->updateOrCreate(
                    ['day_of_week' => $day],
                    ['open_time' => '14:00:00', 'close_time' => '23:00:00']
                );
            }
        }
    }
}
