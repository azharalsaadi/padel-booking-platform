<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PricingRuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'hours_from' => $this->hours_from,
            'hours_to' => $this->hours_to,
            'price_per_hour_baisa' => $this->price_per_hour_baisa,
            'is_active' => $this->is_active,
        ];
    }
}
