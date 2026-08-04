<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\Customer\BookingResource;
use App\Services\GuestBookingService;

class GuestBookingController extends Controller
{
    public function __construct(private readonly GuestBookingService $guestBookingService) {}

    public function show(string $accessToken): BookingResource
    {
        return new BookingResource($this->guestBookingService->findByToken($accessToken));
    }

    public function cancel(string $accessToken): BookingResource
    {
        $booking = $this->guestBookingService->findByToken($accessToken);

        return new BookingResource($this->guestBookingService->cancel($booking));
    }

    public function retryPayment(string $accessToken): BookingResource
    {
        $booking = $this->guestBookingService->findByToken($accessToken);

        return new BookingResource($this->guestBookingService->retryPayment($booking));
    }

    public function refreshPayment(string $accessToken): BookingResource
    {
        $booking = $this->guestBookingService->findByToken($accessToken);

        return new BookingResource($this->guestBookingService->refreshPayment($booking));
    }
}
