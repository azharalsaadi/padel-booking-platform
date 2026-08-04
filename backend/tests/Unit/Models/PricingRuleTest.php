<?php

namespace Tests\Unit\Models;

use App\Models\AdminUser;
use App\Models\PricingRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingRuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_by_relationship_is_nullable(): void
    {
        $rule = PricingRule::factory()->create(['created_by' => null]);

        $this->assertNull($rule->createdBy);
    }

    public function test_created_by_relationship_resolves_to_admin_user(): void
    {
        $admin = AdminUser::factory()->create();
        $rule = PricingRule::factory()->create(['created_by' => $admin->id]);

        $this->assertInstanceOf(AdminUser::class, $rule->createdBy);
    }

    public function test_price_per_hour_baisa_is_an_integer_never_a_float(): void
    {
        $rule = PricingRule::factory()->create(['price_per_hour_baisa' => 8000]);

        $this->assertIsInt($rule->price_per_hour_baisa);
        $this->assertSame(8000, $rule->price_per_hour_baisa);
    }

    public function test_hours_to_may_be_null_for_an_open_ended_top_tier(): void
    {
        $rule = PricingRule::factory()->create(['hours_from' => 5, 'hours_to' => null]);

        $this->assertNull($rule->hours_to);
        $this->assertSame(5, $rule->hours_from);
    }
}
