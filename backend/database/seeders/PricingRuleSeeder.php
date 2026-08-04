<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use App\Models\PricingRule;
use Illuminate\Database\Seeder;

class PricingRuleSeeder extends Seeder
{
    /**
     * Global, non-overlapping duration tiers. Integer baisa only (1 OMR = 1000 baisa).
     */
    public function run(): void
    {
        $adminId = AdminUser::where('email', 'admin@padel.test')->value('id');

        $tiers = [
            ['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 10000], // 10.000 OMR/hr
            ['hours_from' => 2, 'hours_to' => 2, 'price_per_hour_baisa' => 8000],  // 8.000 OMR/hr
            ['hours_from' => 3, 'hours_to' => null, 'price_per_hour_baisa' => 7000], // 7.000 OMR/hr, 3+ hours
        ];

        foreach ($tiers as $tier) {
            PricingRule::updateOrCreate(
                ['hours_from' => $tier['hours_from']],
                [
                    'hours_to' => $tier['hours_to'],
                    'price_per_hour_baisa' => $tier['price_per_hour_baisa'],
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
        }
    }
}
