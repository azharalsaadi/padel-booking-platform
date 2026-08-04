<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourtClosureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'batch_id' => $this->batch_id,
            'court_id' => $this->court_id,
            'court_name' => $this->whenLoaded('court', fn () => $this->court?->name),
            'date_start' => $this->date_start->toDateString(),
            'date_end' => $this->date_end->toDateString(),
            'is_full_day' => $this->is_full_day,
            'start_time' => $this->start_time ? substr($this->start_time, 0, 5) : null,
            'end_time' => $this->end_time ? substr($this->end_time, 0, 5) : null,
            'reason' => $this->reason,
        ];
    }
}
