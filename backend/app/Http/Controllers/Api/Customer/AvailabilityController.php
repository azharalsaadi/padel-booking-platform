<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\AvailabilityRequest;
use App\Http\Resources\Customer\AvailabilitySlotResource;
use App\Services\AvailabilityService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AvailabilityController extends Controller
{
    public function __construct(private readonly AvailabilityService $availabilityService) {}

    public function index(AvailabilityRequest $request): AnonymousResourceCollection
    {
        $slots = $this->availabilityService->getSlotsForDate($request->validated('date'));

        $availableOnly = array_values(array_filter($slots, fn (array $slot) => $slot['available'] === true));

        return AvailabilitySlotResource::collection($availableOnly);
    }
}
