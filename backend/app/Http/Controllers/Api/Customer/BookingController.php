<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreBookingRequest;
use App\Http\Resources\Customer\BookingResource;
use App\Services\BookingCreationService;
use Illuminate\Http\JsonResponse;

class BookingController extends Controller
{
    public function __construct(private readonly BookingCreationService $bookingCreationService) {}

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookingCreationService->create($request->validated());

        return (new BookingResource($booking))->includeAccessToken()->response()->setStatusCode(201);
    }
}
