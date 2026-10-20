<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnitMedicationSetting extends BaseModel
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function medicalUnit(): BelongsTo
    {
        return $this->belongsTo(MedicalUnit::class);
    }

    public function medication(): BelongsTo
    {
        return $this->belongsTo(MedicationCatalogItem::class, 'medication_catalog_item_id');
    }
}
