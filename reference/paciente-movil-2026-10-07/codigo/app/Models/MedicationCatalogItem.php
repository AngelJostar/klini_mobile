<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MedicationCatalogItem extends BaseModel
{
    protected function casts(): array
    {
        return [
            'requires_prescription' => 'boolean',
            'controlled' => 'boolean',
            'cold_chain' => 'boolean',
            'sector_health' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function unitSettings(): HasMany
    {
        return $this->hasMany(UnitMedicationSetting::class);
    }
}

