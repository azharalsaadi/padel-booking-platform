<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * The only authenticatable identity in this system — customers always book
 * as guests (no accounts), so this is deliberately not shared with any
 * customer-facing concept. Authenticated via Sanctum's SPA (session-cookie)
 * flow against the dedicated 'admin' guard, see config/auth.php.
 */
class AdminUser extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function createdCourtClosures(): HasMany
    {
        return $this->hasMany(CourtClosure::class, 'created_by');
    }

    public function createdPricingRules(): HasMany
    {
        return $this->hasMany(PricingRule::class, 'created_by');
    }

    public function createdBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'created_by_admin_id');
    }
}
