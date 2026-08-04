<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateCourtWorkingHoursRequest;
use App\Http\Resources\Admin\CourtResource;
use App\Models\Court;
use App\Models\CourtWorkingHour;
use Illuminate\Support\Facades\DB;

class CourtWorkingHoursController extends Controller
{
    /**
     * Bulk-replaces the court's entire weekly schedule. Submitting fewer
     * than 7 entries is valid — any day_of_week left out becomes "closed"
     * for that court (no working_hours row = closed, the established
     * convention).
     */
    public function update(UpdateCourtWorkingHoursRequest $request, Court $court): CourtResource
    {
        DB::transaction(function () use ($request, $court) {
            $court->workingHours()->delete();

            foreach ($request->validated('working_hours') as $entry) {
                CourtWorkingHour::create([
                    'court_id' => $court->id,
                    'day_of_week' => $entry['day_of_week'],
                    'open_time' => $entry['open_time'],
                    'close_time' => $entry['close_time'],
                ]);
            }
        });

        return new CourtResource($court->load('workingHours'));
    }
}
