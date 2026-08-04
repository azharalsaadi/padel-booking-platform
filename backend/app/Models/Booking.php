<?php

namespace App\Models;

use App\Enums\BookingStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    use HasFactory;

    /**
     * booking_reference and access_token are backend-generated (see
     * BookingReferenceGenerator, Step 9) and must never be mass assignable.
     */
    protected $fillable = [
        'customer_phone',
        'customer_name',
        'customer_email',
        'notes',
        'status',
        'payment_method',
        'total_price_baisa',
        'currency',
        'hold_expires_at',
        'confirmed_at',
        'cancelled_at',
        'cancellation_reason',
        'created_by_admin_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => BookingStatus::class,
            'payment_method' => PaymentMethod::class,
            'total_price_baisa' => 'integer',
            'hold_expires_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function bookingSlots(): HasMany
    {
        return $this->hasMany(BookingSlot::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** Nullable: only set for admin-entered walk-in bookings. */
    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by_admin_id');
    }
}
