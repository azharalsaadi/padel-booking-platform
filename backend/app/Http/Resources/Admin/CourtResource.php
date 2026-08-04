<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourtResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'working_hours' => $this->whenLoaded(
                'workingHours',
                fn () => $this->workingHours
                    ->sortBy('day_of_week')
                    ->values()
                    ->map(fn ($hours) => [
                        'day_of_week' => $hours->day_of_week,
                        'open_time' => substr($hours->open_time, 0, 5),
                        'close_time' => substr($hours->close_time, 0, 5),
                    ])
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
