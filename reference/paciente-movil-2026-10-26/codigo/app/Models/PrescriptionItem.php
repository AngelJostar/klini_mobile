<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionItem extends BaseModel
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function medication(): BelongsTo
    {
        return $this->belongsTo(MedicationCatalogItem::class, 'medication_catalog_item_id');
    }
}

