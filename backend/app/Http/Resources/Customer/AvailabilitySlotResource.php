<?php

namespace App\Http\Resources\Customer;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Deliberately whitelists only date/start_time/end_time/available.
 * Court identity is never loaded this far up the stack (AvailabilityService
 * never returns it), so there is nothing here that could leak it.
 */
class AvailabilitySlotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'date' => $this['date'],
            'start_time' => $this['start_time'],
            'end_time' => $this['end_time'],
            'available' => $this['available'],
        ];
    }
}
