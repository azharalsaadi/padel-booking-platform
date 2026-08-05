<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\Customer\BookingResource;
use App\Services\BookingPdfService;
use App\Services\GuestBookingService;
use Illuminate\Http\Response;

class GuestBookingController extends Controller
{
    public function __construct(
        private readonly GuestBookingService $guestBookingService,
        private readonly BookingPdfService $bookingPdfService,
    ) {}

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

    /**
     * The access token is the only credential required — same protection
     * model as show/cancel/retry/refresh above. Court identity is safe to
     * include here unconditionally (unlike BookingResource's JSON output):
     * this endpoint is only ever reachable via a real booking's own token,
     * and the frontend button that calls it is itself gated to paid
     * bookings only.
     */
    public function downloadPdf(string $accessToken): Response
    {
        $booking = $this->guestBookingService->findByToken($accessToken);

        return $this->bookingPdfService->download($booking);
    }
}
