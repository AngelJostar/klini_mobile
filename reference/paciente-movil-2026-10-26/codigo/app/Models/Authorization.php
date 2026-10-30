<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Authorization extends BaseModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'requested_at' => 'date',
            'responded_at' => 'date',
            'valid_until' => 'date',
            'authorized_amount' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function treatment(): BelongsTo
    {
        return $this->belongsTo(Treatment::class);
    }

    public function hospitalization(): BelongsTo
    {
        return $this->belongsTo(Hospitalization::class);
    }
}
