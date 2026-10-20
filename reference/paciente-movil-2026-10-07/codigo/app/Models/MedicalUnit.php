<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MedicalUnit extends BaseModel
{
    protected function casts(): array
    {
        return [
            'partidas' => 'array',
            'subpartidas' => 'array',
            'source_sheets' => 'array',
            'metadata' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'beds' => 'integer',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function contractedServices(): HasMany
    {
        return $this->hasMany(ContractedService::class);
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function providerRequests(): HasMany
    {
        return $this->hasMany(ProviderRequest::class);
    }

    public function operationalProfiles(): HasMany
    {
        return $this->hasMany(OperationalProfile::class);
    }

    public function doctors(): HasMany
    {
        return $this->hasMany(Doctor::class);
    }

    public function procedureAreas(): HasMany
    {
        return $this->hasMany(ProcedureArea::class);
    }
}
