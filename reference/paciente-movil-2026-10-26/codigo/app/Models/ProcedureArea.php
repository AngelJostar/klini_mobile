<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProcedureArea extends BaseModel
{
    protected function casts(): array
    {
        return [
            'simultaneous_capacity' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function medicalUnit(): BelongsTo
    {
        return $this->belongsTo(MedicalUnit::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ProcedureAreaSchedule::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
