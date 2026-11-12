<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyProduct extends BaseModel
{
    protected function casts(): array
    {
        return ['requires_prescription' => 'boolean', 'controlled' => 'boolean', 'cold_chain' => 'boolean', 'sector_health' => 'boolean', 'price' => 'decimal:2', 'metadata' => 'array', 'stock' => 'integer', 'featured' => 'boolean', 'compare_at_price' => 'decimal:2'];
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function scopePubliclyAvailable(Builder $query): Builder
    {
        return $query->where('status', 'active')->whereBetween('price', [0, 999999.99])->where('controlled', false)->where('cold_chain', false)
            ->whereHas('provider', function ($provider) {
                $provider->where('digital_pharmacy_enabled', true)->where('status', 'active')
                    ->whereIn('provider_type', ['medicines', 'medication', 'distributor'])
                    ->whereHas('user', fn ($user) => $user->where('role', 'provider')->where('status', 'active'));
            });
    }

    public function inventories(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }
}
