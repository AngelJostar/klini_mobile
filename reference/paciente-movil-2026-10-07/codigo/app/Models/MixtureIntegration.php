<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MixtureIntegration extends BaseModel
{
    protected function casts(): array
    {
        return [
            'last_synced_at' => 'datetime',
            'next_retry_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function providerRequest(): BelongsTo
    {
        return $this->belongsTo(ProviderRequest::class);
    }
}
