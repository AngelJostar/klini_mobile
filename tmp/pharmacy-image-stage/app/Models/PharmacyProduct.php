<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyProduct extends BaseModel
{
    public const STORE_IMAGE_METADATA_KEY = 'digital_pharmacy_image';

    protected function casts(): array
    {
        return ['requires_prescription' => 'boolean', 'controlled' => 'boolean', 'cold_chain' => 'boolean', 'sector_health' => 'boolean', 'price' => 'decimal:2', 'metadata' => 'array', 'stock' => 'integer', 'featured' => 'boolean', 'compare_at_price' => 'decimal:2'];
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    /** Only files stored under this product and distributor may be served. */
    public function uploadedStoreImage(): ?array
    {
        $metadata = $this->metadata;
        $image = is_array($metadata) ? ($metadata[self::STORE_IMAGE_METADATA_KEY] ?? null) : null;
        if (!is_array($image) || !is_string($image['path'] ?? null) || !is_string($image['mime'] ?? null)) {
            return null;
        }
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $extension = $extensions[$image['mime']] ?? null;
        $directory = 'pharmacy-products/'.(int) $this->provider_id.'/'.(int) $this->id.'/';
        if (!$extension || !preg_match('#^'.preg_quote($directory, '#').'[a-f0-9]{32}\\.'.preg_quote($extension, '#').'$#D', $image['path'])) {
            return null;
        }

        return ['path' => $image['path'], 'mime' => $image['mime']];
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
