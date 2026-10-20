<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PatientOrder extends BaseModel
{
    protected function casts(): array
    {
        return [
            'ordered_at' => 'datetime',
            'metadata' => 'array',
            'subtotal' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PatientOrderItem::class);
    }

    public function deliveryRoutes(): HasMany
    {
        return $this->hasMany(DeliveryRoute::class);
    }
}
