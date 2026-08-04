<?php

namespace Tests\Unit\Models;

use App\Models\AdminUser;
use App\Models\Court;
use App\Models\CourtClosure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourtClosureTest extends TestCase
{
    use RefreshDatabase;

    public function test_court_relationship_is_nullable_for_all_courts_closure(): void
    {
        $closure = CourtClosure::factory()->create(['court_id' => null]);

        $this->assertNull($closure->court_id);
        $this->assertNull($closure->court);
    }

    public function test_court_relationship_resolves_when_set(): void
    {
        $court = Court::factory()->create();
        $closure = CourtClosure::factory()->create(['court_id' => $court->id]);

        $this->assertInstanceOf(Court::class, $closure->court);
        $this->assertSame($court->id, $closure->court->id);
    }

    public function test_created_by_relationship_is_nullable(): void
    {
        $closure = CourtClosure::factory()->create(['created_by' => null]);

        $this->assertNull($closure->createdBy);
    }

    public function test_created_by_relationship_resolves_to_admin_user(): void
    {
        $admin = AdminUser::factory()->create();
        $closure = CourtClosure::factory()->create(['created_by' => $admin->id]);

        $this->assertInstanceOf(AdminUser::class, $closure->createdBy);
        $this->assertSame($admin->id, $closure->createdBy->id);
    }

    public function test_date_and_boolean_casts(): void
    {
        $closure = CourtClosure::factory()->create([
            'date_start' => '2026-08-10',
            'date_end' => '2026-08-12',
            'is_full_day' => 1,
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $closure->date_start);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $closure->date_end);
        $this->assertIsBool($closure->is_full_day);
        $this->assertTrue($closure->is_full_day);
    }

    public function test_multiple_courts_can_share_one_batch_id(): void
    {
        $batchId = (string) \Illuminate\Support\Str::uuid();
        $courts = Court::factory()->count(3)->create();

        foreach ($courts as $court) {
            CourtClosure::factory()->create(['batch_id' => $batchId, 'court_id' => $court->id]);
        }

        $this->assertCount(3, CourtClosure::where('batch_id', $batchId)->get());
    }
}
