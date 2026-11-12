<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MobileWalletAccount extends BaseModel
{
    protected $guarded = [];

    protected $hidden = [];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'user_id' => 'integer',
            'blocked' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recharges(): HasMany
    {
        return $this->hasMany(MobileWalletRecharge::class, 'wallet_account_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(MobileWalletMovement::class, 'wallet_account_id');
    }

    public function balanceCents(): int
    {
        return (int) $this->movements()->sum('amount_cents');
    }
}
