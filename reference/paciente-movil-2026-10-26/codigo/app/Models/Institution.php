<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Institution extends BaseModel
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function medicalUnits(): HasMany
    {
        return $this->hasMany(MedicalUnit::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(ContractedService::class);
    }
}

