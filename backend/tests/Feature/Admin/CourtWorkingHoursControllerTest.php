<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Court;
use App\Models\CourtWorkingHour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourtWorkingHoursControllerTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): AdminUser
    {
        return AdminUser::factory()->create();
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $court = Court::factory()->create();

        $this->putJson("/api/admin/courts/{$court->id}/working-hours", ['working_hours' => []])
            ->assertStatus(401);
    }

    public function test_replaces_the_courts_full_weekly_schedule(): void
    {
        $court = Court::factory()->create();
        CourtWorkingHour::factory()->create(['court_id' => $court->id, 'day_of_week' => 0]);

        $response = $this->actingAs($this->admin(), 'admin')->putJson(
            "/api/admin/courts/{$court->id}/working-hours",
            ['working_hours' => [
                ['day_of_week' => 0, 'open_time' => '16:00', 'close_time' => '23:00'],
                ['day_of_week' => 5, 'open_time' => '14:00', 'close_time' => '23:00'],
            ]]
        );

        $response->assertOk();
        $response->assertJsonCount(2, 'data.working_hours');
        $this->assertSame(2, CourtWorkingHour::where('court_id', $court->id)->count());
        $this->assertDatabaseHas('court_working_hours', ['court_id' => $court->id, 'day_of_week' => 5, 'open_time' => '14:00:00']);
    }

    public function test_fewer_than_seven_days_means_the_rest_are_closed(): void
    {
        $court = Court::factory()->create();
        CourtWorkingHour::factory()->count(7)->sequence(
            fn ($sequence) => ['day_of_week' => $sequence->index]
        )->create(['court_id' => $court->id]);

        $response = $this->actingAs($this->admin(), 'admin')->putJson(
            "/api/admin/courts/{$court->id}/working-hours",
            ['working_hours' => [
                ['day_of_week' => 0, 'open_time' => '16:00', 'close_time' => '23:00'],
            ]]
        );

        $response->assertOk();
        $this->assertSame(1, CourtWorkingHour::where('court_id', $court->id)->count());
    }

    public function test_empty_array_closes_the_court_every_day(): void
    {
        $court = Court::factory()->create();
        CourtWorkingHour::factory()->create(['court_id' => $court->id]);

        $response = $this->actingAs($this->admin(), 'admin')->putJson(
            "/api/admin/courts/{$court->id}/working-hours",
            ['working_hours' => []]
        );

        $response->assertOk();
        $this->assertSame(0, CourtWorkingHour::where('court_id', $court->id)->count());
    }

    public function test_duplicate_day_of_week_is_rejected(): void
    {
        $court = Court::factory()->create();

        $response = $this->actingAs($this->admin(), 'admin')->putJson(
            "/api/admin/courts/{$court->id}/working-hours",
            ['working_hours' => [
                ['day_of_week' => 0, 'open_time' => '16:00', 'close_time' => '23:00'],
                ['day_of_week' => 0, 'open_time' => '10:00', 'close_time' => '12:00'],
            ]]
        );

        $response->assertStatus(422);
    }

    public function test_close_time_must_be_after_open_time(): void
    {
        $court = Court::factory()->create();

        $response = $this->actingAs($this->admin(), 'admin')->putJson(
            "/api/admin/courts/{$court->id}/working-hours",
            ['working_hours' => [
                ['day_of_week' => 0, 'open_time' => '20:00', 'close_time' => '18:00'],
            ]]
        );

        $response->assertStatus(422);
    }
}
