<?php

namespace Tests\Unit\Services;

use App\Models\AdminUser;
use App\Models\Court;
use App\Models\CourtClosure;
use App\Services\ClosureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClosureServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): ClosureService
    {
        return new ClosureService();
    }

    public function test_single_court_single_date_produces_one_row_with_no_batch_id(): void
    {
        $court = Court::factory()->create();

        $created = $this->service()->create([
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'single', 'values' => ['2026-08-10']],
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => null,
        ], null);

        $this->assertCount(1, $created);
        $this->assertNull($created->first()->batch_id);
        $this->assertSame($court->id, $created->first()->court_id);
    }

    public function test_all_courts_produces_one_row_with_null_court_id(): void
    {
        Court::factory()->count(3)->create();

        $created = $this->service()->create([
            'court_ids' => null,
            'dates' => ['mode' => 'single', 'values' => ['2026-08-10']],
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => null,
        ], null);

        $this->assertCount(1, $created);
        $this->assertNull($created->first()->court_id);
    }

    public function test_multiple_courts_times_multiple_dates_produces_the_cross_product_in_one_batch(): void
    {
        $courtA = Court::factory()->create();
        $courtB = Court::factory()->create();

        $created = $this->service()->create([
            'court_ids' => [$courtA->id, $courtB->id],
            'dates' => ['mode' => 'multiple', 'values' => ['2026-08-10', '2026-08-15', '2026-08-20']],
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => null,
        ], null);

        // 2 courts x 3 dates = 6 rows, all one batch.
        $this->assertCount(6, $created);
        $this->assertCount(1, $created->pluck('batch_id')->unique());
        $this->assertCount(2, $created->pluck('court_id')->unique());
    }

    public function test_range_mode_stores_one_row_per_court_not_one_per_day(): void
    {
        $court = Court::factory()->create();

        $created = $this->service()->create([
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'range', 'range' => ['start' => '2026-08-10', 'end' => '2026-08-20']],
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => null,
        ], null);

        $this->assertCount(1, $created);
        $this->assertSame('2026-08-10', $created->first()->date_start->toDateString());
        $this->assertSame('2026-08-20', $created->first()->date_end->toDateString());
    }

    public function test_created_by_is_recorded_when_provided(): void
    {
        $court = Court::factory()->create();
        $admin = AdminUser::factory()->create();

        $created = $this->service()->create([
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'single', 'values' => ['2026-08-10']],
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => null,
        ], $admin->id);

        $this->assertSame($admin->id, $created->first()->created_by);
    }

    public function test_delete_batch_removes_only_that_batchs_rows(): void
    {
        $court = Court::factory()->create();

        $batchA = $this->service()->create([
            'court_ids' => [$court->id],
            'dates' => ['mode' => 'multiple', 'values' => ['2026-08-10', '2026-08-11']],
            'is_full_day' => true,
            'start_time' => null,
            'end_time' => null,
            'reason' => null,
        ], null);

        $untouched = CourtClosure::factory()->create(['court_id' => $court->id]);

        $deletedCount = $this->service()->deleteBatch($batchA->first()->batch_id);

        $this->assertSame(2, $deletedCount);
        $this->assertDatabaseMissing('court_closures', ['id' => $batchA->first()->id]);
        $this->assertDatabaseHas('court_closures', ['id' => $untouched->id]);
    }
}
