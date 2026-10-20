<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProviderRequest extends BaseModel
{
    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'required_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function medicalUnit(): BelongsTo
    {
        return $this->belongsTo(MedicalUnit::class);
    }

    public function statusEvents(): HasMany
    {
        return $this->hasMany(ProviderRequestStatusEvent::class);
    }

    public function deliveryRoutes(): HasMany
    {
        return $this->hasMany(DeliveryRoute::class);
    }

    public function mixtureIntegration(): HasOne
    {
        return $this->hasOne(MixtureIntegration::class);
    }
}
