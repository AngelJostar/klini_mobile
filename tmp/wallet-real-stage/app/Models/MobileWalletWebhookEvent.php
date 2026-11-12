<?php

namespace App\Models;

class MobileWalletWebhookEvent extends BaseModel
{
    protected $guarded = [];

    protected $hidden = [];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'processed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
