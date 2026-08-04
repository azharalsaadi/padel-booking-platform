<?php

namespace App\Models;

use App\Enums\BookingSlotStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingSlot extends Model
{
    use HasFactory;

    /**
     * lock_key is a MySQL STORED GENERATED column (see the booking_slots
     * migration) — it is never mass assignable, and the database itself
     * rejects any attempt to write to it directly, active status only.
     */
    protected $fillable = [
        'booking_id',
        'court_id',
        'date',
        'start_time',
        'end_time',
        'price_baisa',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'status' => BookingSlotStatus::class,
            'price_baisa' => 'integer',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Internal-only: the randomly assigned court. Customer-facing API
     * Resources must never serialize this relationship or its id/name.
     */
    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }
}
