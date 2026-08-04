<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminBookingIndexRequest;
use App\Http\Resources\Admin\AdminBookingResource;
use App\Models\Booking;
use App\Services\PaymentService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminBookingController extends Controller
{
    public function __construct(private readonly PaymentService $paymentService) {}

    /**
     * All 5 mandatory filters (court, date, status, payment method, phone)
     * plus booking_reference search. bookingSlots.court and payments are
     * eager-loaded up front so AdminBookingResource never triggers N+1
     * queries per row.
     */
    public function index(AdminBookingIndexRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $bookings = Booking::query()
            ->with(['bookingSlots.court', 'payments'])
            ->when(
                $filters['court_id'] ?? null,
                fn ($query, $courtId) => $query->whereHas('bookingSlots', fn ($q) => $q->where('court_id', $courtId))
            )
            ->when(
                $filters['date_from'] ?? null,
                fn ($query, $date) => $query->whereHas('bookingSlots', fn ($q) => $q->where('date', '>=', $date))
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($query, $date) => $query->whereHas('bookingSlots', fn ($q) => $q->where('date', '<=', $date))
            )
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when(
                $filters['payment_method'] ?? null,
                fn ($query, $method) => $query->where('payment_method', $method)
            )
            ->when(
                $filters['phone'] ?? null,
                fn ($query, $phone) => $query->where('customer_phone', 'like', "%{$phone}%")
            )
            ->when(
                $filters['reference'] ?? null,
                fn ($query, $reference) => $query->where('booking_reference', 'like', "%{$reference}%")
            )
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return AdminBookingResource::collection($bookings);
    }

    public function show(Booking $booking): AdminBookingResource
    {
        return new AdminBookingResource($booking->load(['bookingSlots.court', 'payments']));
    }

    /**
     * Confirms cash/card collected at the venue — see
     * PaymentService::markPayAtVenuePaid for the exact conditions this
     * requires (pay-at-venue, still pending, booking not cancelled/expired).
     */
    public function markPaid(Booking $booking): AdminBookingResource
    {
        return new AdminBookingResource($this->paymentService->markPayAtVenuePaid($booking));
    }
}
