<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\QuoteBookingRequest;
use App\Http\Resources\Customer\QuoteResource;
use App\Services\AvailabilityService;
use App\Services\PricingService;

class BookingQuoteController extends Controller
{
    public function __construct(
        private readonly PricingService $pricingService,
        private readonly AvailabilityService $availabilityService,
    ) {}

    /**
     * Non-binding: prices the requested slots and reports whether they're
     * currently available, but reserves nothing, assigns no court, and
     * creates no booking or payment. The real booking step (Step 9+) must
     * recalculate and revalidate everything — availability can change
     * between a quote and a booking attempt.
     */
    public function __invoke(QuoteBookingRequest $request): QuoteResource
    {
        $slots = $request->validated('slots');

        $pricing = $this->pricingService->quote($slots);

        $availability = $this->availabilityService->checkSlotsAvailability(
            array_map(
                fn (array $slot) => ['date' => $slot['date'], 'start_time' => $slot['start_time']],
                $slots
            )
        );

        return new QuoteResource([
            ...$pricing,
            'all_slots_available' => $availability['all_available'],
            'unavailable_slots' => $availability['unavailable'],
        ]);
    }
}
