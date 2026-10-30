<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Medication extends BaseModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'requires_authorization' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function pharmacyProduct(): BelongsTo
    {
        return $this->belongsTo(PharmacyProduct::class);
    }

    public function catalogItem(): BelongsTo
    {
        return $this->belongsTo(MedicationCatalogItem::class, 'medication_catalog_item_id');
    }

    public function treatments(): HasMany
    {
        return $this->hasMany(Treatment::class);
    }
}
