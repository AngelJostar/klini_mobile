<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientOrderItem extends BaseModel
{
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'total' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(PatientOrder::class, 'patient_order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(PharmacyProduct::class, 'pharmacy_product_id');
    }
}

