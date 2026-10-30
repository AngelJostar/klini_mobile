<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderRequestStatusEvent extends BaseModel
{
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function providerRequest(): BelongsTo
    {
        return $this->belongsTo(ProviderRequest::class);
    }
}

