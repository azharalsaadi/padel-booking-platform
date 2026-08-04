<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Court;
use App\Models\CourtClosure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClosureControllerTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): AdminUser
    {
        return AdminUser::factory()->create();
    }

    private function futureDate(int $days = 5): string
    {
        return now()->addDays($days)->toDateString();
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->postJson('/api/admin/closures', [])->assertStatus(401);
    }

    // --- Single court, single date -------------------------------------

    public function test_single_court_single_date_creates_one_row_with_no_batch_id(): void
    {
        $court = Court::factory()->create();
        $date = $this->futureDate();

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'single', 'values' => [$date]],
            'is_full_day' => true,
            'reason' => 'Maintenance',
        ]);

        $response->assertCreated();
        $response->assertJsonCount(1, 'data');
        $this->assertDatabaseHas('court_closures', [
            'court_id' => $court->id,
            'date_start' => $date,
            'date_end' => $date,
            'is_full_day' => true,
            'batch_id' => null,
        ]);
    }

    /**
     * Regression: the real frontend (ClosureForm.tsx) sends start_time/
     * end_time as explicit null when full-day is checked, not omitted
     * entirely — required_if alone does not exempt a null value from
     * date_format, so this 422'd with "must match the format H:i" until
     * 'nullable' was added to both rules.
     */
    public function test_full_day_closure_accepts_explicit_null_start_and_end_time(): void
    {
        $court = Court::factory()->create();
        $date = $this->futureDate();

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'single', 'values' => [$date]],
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('court_closures', [
            'court_id' => $court->id,
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
        ]);
    }

    // --- Multiple courts share one batch_id -----------------------------

    public function test_multiple_courts_share_one_batch_id(): void
    {
        $courtA = Court::factory()->create();
        $courtB = Court::factory()->create();
        $date = $this->futureDate();

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$courtA->id, $courtB->id],
            'dates' => ['mode' => 'single', 'values' => [$date]],
            'is_full_day' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonCount(2, 'data');

        $rows = CourtClosure::whereIn('court_id', [$courtA->id, $courtB->id])->get();
        $this->assertCount(2, $rows);
        $this->assertCount(1, $rows->pluck('batch_id')->unique());
        $this->assertNotNull($rows->first()->batch_id);
    }

    // --- Multiple non-consecutive dates share one batch_id --------------

    public function test_multiple_non_consecutive_dates_share_one_batch_id(): void
    {
        $court = Court::factory()->create();
        $date1 = $this->futureDate(5);
        $date2 = $this->futureDate(20);

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'multiple', 'values' => [$date1, $date2]],
            'is_full_day' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonCount(2, 'data');

        $rows = CourtClosure::where('court_id', $court->id)->get();
        $this->assertCount(2, $rows);
        $this->assertCount(1, $rows->pluck('batch_id')->unique());
        $this->assertEqualsCanonicalizing([$date1, $date2], $rows->pluck('date_start')->map->toDateString()->all());
    }

    // --- Date range stored natively, not exploded -----------------------

    public function test_date_range_is_stored_as_one_row_not_exploded_per_day(): void
    {
        $court = Court::factory()->create();
        $start = $this->futureDate(5);
        $end = $this->futureDate(10);

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'range', 'range' => ['start' => $start, 'end' => $end]],
            'is_full_day' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonCount(1, 'data');
        $this->assertDatabaseHas('court_closures', [
            'court_id' => $court->id,
            'date_start' => $start,
            'date_end' => $end,
        ]);
    }

    // --- All courts -------------------------------------------------

    public function test_omitting_court_ids_closes_all_courts_globally(): void
    {
        $date = $this->futureDate();

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'dates' => ['mode' => 'single', 'values' => [$date]],
            'is_full_day' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.0.court_id', null);
        $this->assertDatabaseHas('court_closures', ['court_id' => null, 'date_start' => $date]);
    }

    // --- Partial-time closure -------------------------------------------

    public function test_partial_time_closure_requires_start_and_end_time(): void
    {
        $court = Court::factory()->create();

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'single', 'values' => [$this->futureDate()]],
            'is_full_day' => false,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['start_time', 'end_time']);
    }

    public function test_partial_time_closure_is_created_correctly(): void
    {
        $court = Court::factory()->create();

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'single', 'values' => [$this->futureDate()]],
            'is_full_day' => false,
            'start_time' => '10:00',
            'end_time' => '12:00',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.0.is_full_day', false);
        $response->assertJsonPath('data.0.start_time', '10:00');
        $response->assertJsonPath('data.0.end_time', '12:00');
    }

    // --- Validation ---------------------------------------------------

    public function test_unknown_court_id_is_rejected(): void
    {
        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [999999],
            'dates' => ['mode' => 'single', 'values' => [$this->futureDate()]],
            'is_full_day' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('court_ids.0');
    }

    /**
     * Step 17 hardening: ClosureService::create() expands court_ids x
     * dates.values as a cross-product with no cap of its own — an
     * unbounded dates.values array means unbounded row creation from one
     * request.
     */
    public function test_more_than_100_scattered_dates_is_rejected(): void
    {
        $court = Court::factory()->create();
        $dates = collect(range(1, 101))->map(fn (int $day) => $this->futureDate($day))->all();

        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'multiple', 'values' => $dates],
            'is_full_day' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('dates.values');
        $this->assertSame(0, CourtClosure::count());
    }

    // --- Index / destroy ------------------------------------------------

    public function test_index_lists_closures_with_court_name(): void
    {
        $court = Court::factory()->create(['name' => 'Court 1']);
        CourtClosure::factory()->create(['court_id' => $court->id]);

        $response = $this->actingAs($this->admin(), 'admin')->getJson('/api/admin/closures');

        $response->assertOk();
        $response->assertJsonPath('data.0.court_name', 'Court 1');
    }

    public function test_destroy_removes_a_single_closure_row(): void
    {
        $closure = CourtClosure::factory()->create();

        $this->actingAs($this->admin(), 'admin')
            ->deleteJson("/api/admin/closures/{$closure->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('court_closures', ['id' => $closure->id]);
    }

    public function test_destroy_batch_removes_every_row_in_the_batch(): void
    {
        $court = Court::factory()->create();
        $response = $this->actingAs($this->admin(), 'admin')->postJson('/api/admin/closures', [
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'multiple', 'values' => [$this->futureDate(5), $this->futureDate(6), $this->futureDate(7)]],
            'is_full_day' => true,
        ]);
        $batchId = $response->json('data.0.batch_id');
        $this->assertNotNull($batchId);
        $this->assertSame(3, CourtClosure::where('batch_id', $batchId)->count());

        $deleteResponse = $this->actingAs($this->admin(), 'admin')->deleteJson("/api/admin/closures/batch/{$batchId}");

        $deleteResponse->assertOk();
        $deleteResponse->assertJsonPath('deleted_count', 3);
        $this->assertSame(0, CourtClosure::where('batch_id', $batchId)->count());
    }
}
