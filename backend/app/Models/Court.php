<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Court identity is admin-only for every pre-confirmation customer response.
 * The one deliberate exception: Customer\BookingResource exposes the
 * assigned court's name once a booking is booking_status=confirmed AND its
 * payment is payment_status=paid — the customer needs to know where to
 * play. Never the court id, and never for pending/failed/cancelled
 * bookings. Enforced at the Resource layer, not here.
 */
class Court extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function workingHours(): HasMany
    {
        return $this->hasMany(CourtWorkingHour::class);
    }

    public function closures(): HasMany
    {
        return $this->hasMany(CourtClosure::class);
    }

    public function bookingSlots(): HasMany
    {
        return $this->hasMany(BookingSlot::class);
    }
}
