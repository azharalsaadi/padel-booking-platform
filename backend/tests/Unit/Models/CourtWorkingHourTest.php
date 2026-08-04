<?php

namespace Tests\Unit\Models;

use App\Models\Court;
use App\Models\CourtWorkingHour;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourtWorkingHourTest extends TestCase
{
    use RefreshDatabase;

    public function test_belongs_to_court(): void
    {
        $court = Court::factory()->create();
        $hours = CourtWorkingHour::factory()->create(['court_id' => $court->id]);

        $this->assertInstanceOf(Court::class, $hours->court);
        $this->assertSame($court->id, $hours->court->id);
    }

    public function test_day_of_week_is_cast_to_integer(): void
    {
        $hours = CourtWorkingHour::factory()->create(['day_of_week' => '3']);

        $this->assertSame(3, $hours->day_of_week);
    }

    public function test_duplicate_court_and_day_of_week_is_rejected(): void
    {
        $court = Court::factory()->create();
        CourtWorkingHour::factory()->create(['court_id' => $court->id, 'day_of_week' => 1]);

        $this->expectException(QueryException::class);

        CourtWorkingHour::factory()->create(['court_id' => $court->id, 'day_of_week' => 1]);
    }
}
