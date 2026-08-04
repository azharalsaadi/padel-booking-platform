<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use App\Models\Court;
use App\Models\CourtClosure;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CourtClosureSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = AdminUser::where('email', 'admin@padel.test')->value('id');
        $court1 = Court::where('name', 'Court 1')->firstOrFail();
        $court2 = Court::where('name', 'Court 2')->firstOrFail();
        $court3 = Court::where('name', 'Court 3')->firstOrFail();

        // 1. Single court, single date, full-day closure (maintenance).
        CourtClosure::create([
            'batch_id' => null,
            'court_id' => $court1->id,
            'date_start' => now()->addDays(7)->toDateString(),
            'date_end' => now()->addDays(7)->toDateString(),
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => 'Court maintenance',
            'created_by' => $adminId,
        ]);

        // 2. Multiple selected courts, same batch_id (one row per court).
        $batchId = (string) Str::uuid();
        foreach ([$court2, $court3] as $court) {
            CourtClosure::create([
                'batch_id' => $batchId,
                'court_id' => $court->id,
                'date_start' => now()->addDays(10)->toDateString(),
                'date_end' => now()->addDays(10)->toDateString(),
                'is_full_day' => true,
                'start_time' => null,
                'end_time' => null,
                'reason' => 'Private tournament booking',
                'created_by' => $adminId,
            ]);
        }

        // 3. Global closure (court_id = null applies to all courts).
        CourtClosure::create([
            'batch_id' => null,
            'court_id' => null,
            'date_start' => now()->addDays(14)->toDateString(),
            'date_end' => now()->addDays(14)->toDateString(),
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => 'Public holiday',
            'created_by' => $adminId,
        ]);

        // 4. Partial-time closure on a single court.
        CourtClosure::create([
            'batch_id' => null,
            'court_id' => $court1->id,
            'date_start' => now()->addDays(3)->toDateString(),
            'date_end' => now()->addDays(3)->toDateString(),
            'is_full_day' => false,
            'start_time' => '10:00:00',
            'end_time' => '12:00:00',
            'reason' => 'Scheduled resurfacing work',
            'created_by' => $adminId,
        ]);
    }
}
