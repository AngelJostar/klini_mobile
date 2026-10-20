<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryReport extends BaseModel
{
    protected function casts(): array
    {
        return [
            'reported_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(DeliveryRoute::class, 'delivery_route_id');
    }
}

