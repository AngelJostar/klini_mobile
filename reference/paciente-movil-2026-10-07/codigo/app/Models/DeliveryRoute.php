<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryRoute extends BaseModel
{
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function messenger(): BelongsTo
    {
        return $this->belongsTo(MessengerProfile::class, 'messenger_profile_id');
    }

    public function patientOrder(): BelongsTo
    {
        return $this->belongsTo(PatientOrder::class);
    }

    public function providerRequest(): BelongsTo
    {
        return $this->belongsTo(ProviderRequest::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(DeliveryReport::class);
    }
}
