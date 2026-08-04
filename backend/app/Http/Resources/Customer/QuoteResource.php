<?php

namespace App\Http\Resources\Customer;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Whitelists exactly the approved quote contract. Court information is
 * never present upstream (PricingService and AvailabilityService never
 * return it), so there is nothing here that could leak it.
 */
class QuoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'currency' => $this['currency'],
            'total_hours' => $this['total_hours'],
            'days' => $this['days'],
            'standard_subtotal_baisa' => $this['standard_subtotal_baisa'],
            'applied_rule' => $this['applied_rule'],
            'discount_baisa' => $this['discount_baisa'],
            'total_price_baisa' => $this['total_price_baisa'],
            'all_slots_available' => $this['all_slots_available'],
            'unavailable_slots' => $this['unavailable_slots'],
        ];
    }
}
