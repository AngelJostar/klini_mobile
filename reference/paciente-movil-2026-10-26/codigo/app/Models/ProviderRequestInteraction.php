<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderRequestInteraction extends BaseModel
{
    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    public function providerRequest(): BelongsTo
    {
        return $this->belongsTo(ProviderRequest::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
