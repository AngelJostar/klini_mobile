<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperationalProfile extends BaseModel
{
    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function medicalUnit(): BelongsTo
    {
        return $this->belongsTo(MedicalUnit::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(OperationalArea::class, 'operational_area_id');
    }
}

