<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MobileDeviceRegistration extends Model
{
    protected $fillable = [
        'user_id', 'personal_access_token_id', 'token_hash', 'push_token',
        'platform', 'device_name', 'enabled', 'last_seen_at',
    ];

    protected $hidden = ['push_token', 'token_hash'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean', 'last_seen_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
