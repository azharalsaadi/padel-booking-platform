<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PricingRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'hours_from',
        'hours_to',
        'price_per_hour_baisa',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'hours_from' => 'integer',
            'hours_to' => 'integer',
            'price_per_hour_baisa' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }
}
