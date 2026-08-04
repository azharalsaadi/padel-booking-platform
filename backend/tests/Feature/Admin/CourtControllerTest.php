<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Court;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourtControllerTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): AdminUser
    {
        return AdminUser::factory()->create();
    }

    // --- Authorization ---------------------------------------------------

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/admin/courts')->assertStatus(401);
        $this->postJson('/api/admin/courts', [])->assertStatus(401);
    }

    // --- Index / show ------------------------------------------------

    public function test_index_lists_courts(): void
    {
        Court::factory()->count(3)->create();

        $response = $this->actingAs($this->admin(), 'admin')->getJson('/api/admin/courts');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    }

    public function test_show_returns_a_single_court_with_working_hours(): void
    {
        $court = Court::factory()->create();

        $response = $this->actingAs($this->admin(), 'admin')->getJson("/api/admin/courts/{$court->id}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $court->id);
        $response->assertJsonStructure(['data' => ['id', 'name', 'description', 'is_active', 'sort_order', 'working_hours']]);
    }

    public function test_show_returns_404_for_a_soft_deleted_court(): void
    {
        $court = Court::factory()->create();
        $court->delete();

        $this->actingAs($this->admin(), 'admin')
            ->getJson("/api/admin/courts/{$court->id}")
            ->assertStatus(404);
    }

    // --- Store ------------------------------------------------------

    public function test_store_creates_a_court(): void
    {
        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/courts', [
            'name' => 'Court 4',
            'description' => 'New court',
            'is_active' => true,
            'sort_order' => 4,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'Court 4');
        $this->assertDatabaseHas('courts', ['name' => 'Court 4']);
    }

    public function test_store_requires_a_name(): void
    {
        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/courts', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('name');
    }

    /** Step 17 hardening: every other free-text field in the app (notes, closure reason) already caps length; description didn't. */
    public function test_store_rejects_an_overlong_description(): void
    {
        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/courts', [
            'name' => 'Court 4',
            'description' => str_repeat('a', 1001),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('description');
    }

    // --- Update -------------------------------------------------------

    public function test_update_modifies_a_court(): void
    {
        $court = Court::factory()->create(['name' => 'Old name', 'is_active' => true]);

        $response = $this->actingAs($this->admin(), 'admin')->putJson("/api/admin/courts/{$court->id}", [
            'name' => 'New name',
            'is_active' => false,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'New name');
        $response->assertJsonPath('data.is_active', false);
        $this->assertSame('New name', $court->fresh()->name);
    }

    public function test_update_rejects_an_overlong_description(): void
    {
        $court = Court::factory()->create();

        $response = $this->actingAs($this->admin(), 'admin')->putJson("/api/admin/courts/{$court->id}", [
            'name' => $court->name,
            'description' => str_repeat('a', 1001),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('description');
    }

    // --- Destroy ------------------------------------------------------

    public function test_destroy_soft_deletes_a_court(): void
    {
        $court = Court::factory()->create();

        $response = $this->actingAs($this->admin(), 'admin')->deleteJson("/api/admin/courts/{$court->id}");

        $response->assertNoContent();
        $this->assertSoftDeleted('courts', ['id' => $court->id]);
    }
}
