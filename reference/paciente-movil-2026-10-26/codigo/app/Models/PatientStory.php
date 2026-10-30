<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientStory extends BaseModel
{
    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now())->whereHas('patient', fn ($patient) => $patient->where('status', 'active'));
    }
}
