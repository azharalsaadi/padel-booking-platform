<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\PricingRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingRuleControllerTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): AdminUser
    {
        return AdminUser::factory()->create();
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/admin/pricing-rules')->assertStatus(401);
    }

    public function test_index_lists_rules_ordered_by_hours_from(): void
    {
        PricingRule::factory()->create(['hours_from' => 3, 'hours_to' => null]);
        PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1]);
        PricingRule::factory()->create(['hours_from' => 2, 'hours_to' => 2]);

        $response = $this->actingAs($this->admin(), 'admin')->getJson('/api/admin/pricing-rules');

        $response->assertOk();
        $response->assertJsonPath('data.0.hours_from', 1);
        $response->assertJsonPath('data.1.hours_from', 2);
        $response->assertJsonPath('data.2.hours_from', 3);
    }

    public function test_store_creates_a_pricing_rule_with_integer_baisa(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin, 'admin')->postJson('/api/admin/pricing-rules', [
            'hours_from' => 1,
            'hours_to' => 1,
            'price_per_hour_baisa' => 10000,
            'is_active' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.price_per_hour_baisa', 10000);
        $this->assertDatabaseHas('pricing_rules', [
            'hours_from' => 1,
            'price_per_hour_baisa' => 10000,
            'created_by' => $admin->id,
        ]);
    }

    public function test_store_rejects_non_positive_price(): void
    {
        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/pricing-rules', [
            'hours_from' => 1,
            'price_per_hour_baisa' => 0,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('price_per_hour_baisa');
    }

    public function test_store_rejects_hours_to_less_than_hours_from(): void
    {
        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/pricing-rules', [
            'hours_from' => 3,
            'hours_to' => 2,
            'price_per_hour_baisa' => 5000,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('hours_to');
    }

    public function test_update_modifies_a_rule(): void
    {
        $rule = PricingRule::factory()->create(['price_per_hour_baisa' => 10000]);

        $response = $this->actingAs($this->admin(), 'admin')->putJson("/api/admin/pricing-rules/{$rule->id}", [
            'hours_from' => $rule->hours_from,
            'hours_to' => $rule->hours_to,
            'price_per_hour_baisa' => 9000,
            'is_active' => false,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.price_per_hour_baisa', 9000);
        $this->assertFalse($rule->fresh()->is_active);
    }

    public function test_destroy_removes_a_rule(): void
    {
        $rule = PricingRule::factory()->create();

        $this->actingAs($this->admin(), 'admin')
            ->deleteJson("/api/admin/pricing-rules/{$rule->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('pricing_rules', ['id' => $rule->id]);
    }
}
