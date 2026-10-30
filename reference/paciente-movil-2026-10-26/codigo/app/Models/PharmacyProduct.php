<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyProduct extends BaseModel
{
    protected function casts(): array
    {
        return [
            'requires_prescription' => 'boolean',
            'controlled' => 'boolean',
            'cold_chain' => 'boolean',
            'sector_health' => 'boolean',
            'price' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    public function inventories(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }
}

