<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $bookingReference }}</title>
    <style>
        body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 12px; }
        .header { border-bottom: 3px solid #000; padding-bottom: 14px; margin-bottom: 24px; }
        .brand { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
        .subtitle { color: #6b6b6b; font-size: 11px; margin-top: 4px; }
        .reference { text-align: right; }
        .reference .label { font-size: 10px; text-transform: uppercase; color: #6b6b6b; letter-spacing: 1px; }
        .reference .value { font-size: 18px; font-weight: bold; margin-top: 2px; }
        table.details { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.details td { padding: 9px 6px; border-bottom: 1px solid #e5e0d8; font-size: 12px; }
        table.details td.label { color: #6b6b6b; width: 40%; }
        table.details td.value { font-weight: bold; text-align: right; }
        .section-title { margin-top: 26px; margin-bottom: 8px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        table.slots { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.slots th { text-align: left; background: #f2ebe5; padding: 8px 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #4e4235; }
        table.slots td { padding: 8px 6px; border-bottom: 1px solid #e5e0d8; font-size: 11px; }
        .total-row td { font-weight: bold; font-size: 14px; border-top: 2px solid #000; border-bottom: none; padding-top: 12px; }
        .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e0d8; color: #6b6b6b; font-size: 10px; text-align: center; }
    </style>
</head>
<body>
    <table style="width: 100%; border-collapse: collapse;" class="header">
        <tr>
            <td>
                <div class="brand">RALLY</div>
                <div class="subtitle">Booking Confirmation</div>
            </td>
            <td class="reference">
                <div class="label">Booking Reference</div>
                <div class="value">{{ $bookingReference }}</div>
            </td>
        </tr>
    </table>

    <table class="details">
        <tr>
            <td class="label">Customer Name</td>
            <td class="value">{{ $customerName }}</td>
        </tr>
        <tr>
            <td class="label">Phone Number</td>
            <td class="value">{{ $customerPhone }}</td>
        </tr>
        <tr>
            <td class="label">Email</td>
            <td class="value">{{ $customerEmail }}</td>
        </tr>
        <tr>
            <td class="label">Court</td>
            <td class="value">{{ $courtName }}</td>
        </tr>
        <tr>
            <td class="label">Date</td>
            <td class="value">{{ $date }}</td>
        </tr>
        <tr>
            <td class="label">Start Time</td>
            <td class="value">{{ $startTime }}</td>
        </tr>
        <tr>
            <td class="label">End Time</td>
            <td class="value">{{ $endTime }}</td>
        </tr>
        <tr>
            <td class="label">Duration</td>
            <td class="value">{{ $duration }}</td>
        </tr>
        <tr>
            <td class="label">Payment Method</td>
            <td class="value">{{ $paymentMethod }}</td>
        </tr>
        <tr>
            <td class="label">Payment Status</td>
            <td class="value">{{ $paymentStatus }}</td>
        </tr>
        <tr>
            <td class="label">Booking Status</td>
            <td class="value">{{ $bookingStatus }}</td>
        </tr>
    </table>

    @if (count($slots) > 1)
        <div class="section-title">Booked Sessions</div>
        <table class="slots">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Court</th>
                    <th style="text-align: right;">Price</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($slots as $slot)
                    <tr>
                        <td>{{ $slot['date'] }}</td>
                        <td>{{ $slot['time'] }}</td>
                        <td>{{ $slot['court'] }}</td>
                        <td style="text-align: right;">{{ $slot['price'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <table class="details" style="margin-top: 14px;">
        <tr class="total-row">
            <td class="label">Total Amount</td>
            <td class="value">{{ $totalAmount }}</td>
        </tr>
    </table>

    <div class="footer">
        Generated {{ $generatedAt }} &middot; Rally Padel Booking Platform
    </div>
</body>
</html>
