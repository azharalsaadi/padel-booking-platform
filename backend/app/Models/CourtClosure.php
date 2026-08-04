<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourtClosure extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'court_id',
        'date_start',
        'date_end',
        'is_full_day',
        'start_time',
        'end_time',
        'reason',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date_start' => 'date',
            'date_end' => 'date',
            'is_full_day' => 'boolean',
        ];
    }

    /** Nullable: a null court_id means the closure applies to all courts. */
    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }
}
