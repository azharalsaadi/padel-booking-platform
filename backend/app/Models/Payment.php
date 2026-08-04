<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    /**
     * Only the fields legitimately set when a payment record is first opened
     * are mass assignable. Gateway-derived fields (thawani_session_id,
     * thawani_payment_id, checkout_url, paid_at, failed_at, raw_payload) are
     * deliberately excluded — PaymentService (Step 10) must set those via
     * direct attribute assignment, never via create()/fill() with request input.
     */
    protected $fillable = [
        'booking_id',
        'method',
        'status',
        'amount_baisa',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'amount_baisa' => 'integer',
            'paid_at' => 'datetime',
            'failed_at' => 'datetime',
            'raw_payload' => 'array',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
