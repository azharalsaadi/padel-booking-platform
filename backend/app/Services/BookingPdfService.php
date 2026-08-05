<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Models\Booking;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

/**
 * Renders the customer-facing booking confirmation PDF (guest download
 * button on ManageBookingPage). Reuses the exact same relations
 * GuestBookingService::findByToken already eager-loads (bookingSlots.court,
 * payments) — expects them pre-loaded, does not query independently.
 */
class BookingPdfService
{
    public function download(Booking $booking): Response
    {
        return Pdf::loadView('pdf.booking', $this->buildViewData($booking))
            ->setPaper('a4')
            ->download($this->filename($booking));
    }

    public function filename(Booking $booking): string
    {
        return "booking-{$booking->booking_reference}.pdf";
    }

    private function buildViewData(Booking $booking): array
    {
        $slots = $booking->bookingSlots
            ->sortBy([['date', 'asc'], ['start_time', 'asc']])
            ->values();

        $primarySlot = $slots->first();
        $payment = $booking->payments->sortByDesc('id')->first();

        return [
            'bookingReference' => $booking->booking_reference,
            'customerName' => $booking->customer_name ?: 'Guest',
            'customerPhone' => $booking->customer_phone,
            'customerEmail' => $booking->customer_email ?: 'Not provided',
            'courtName' => $primarySlot?->court?->name ?? 'Not assigned',
            'date' => $primarySlot ? $primarySlot->date->format('l, d F Y') : 'Not available',
            'startTime' => $primarySlot ? substr($primarySlot->start_time, 0, 5) : 'Not available',
            'endTime' => $primarySlot ? substr($primarySlot->end_time, 0, 5) : 'Not available',
            'duration' => $slots->count().' '.Str::plural('hour', $slots->count()),
            'paymentMethod' => $booking->payment_method === PaymentMethod::Thawani ? 'Thawani (Online Payment)' : 'Pay at Venue',
            'paymentStatus' => $payment ? Str::title($payment->status->value) : 'N/A',
            'bookingStatus' => Str::title(str_replace('_', ' ', $booking->status->value)),
            'totalAmount' => $this->formatBaisa($booking->total_price_baisa, $booking->currency),
            'slots' => $slots->map(fn ($slot) => [
                'date' => $slot->date->format('d M Y'),
                'time' => substr($slot->start_time, 0, 5).' - '.substr($slot->end_time, 0, 5),
                'court' => $slot->court?->name ?? 'Not assigned',
                'price' => $this->formatBaisa($slot->price_baisa, $booking->currency),
            ])->all(),
            'generatedAt' => now()->format('d M Y, H:i'),
        ];
    }

    private function formatBaisa(int $baisa, string $currency): string
    {
        return sprintf('%s %s', $currency, number_format($baisa / 1000, 3));
    }
}
