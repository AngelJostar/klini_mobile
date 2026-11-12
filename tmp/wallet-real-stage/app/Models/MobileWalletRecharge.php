<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MobileWalletRecharge extends BaseModel
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = [];

    protected function casts(): array
    {
        return [
            'wallet_account_id' => 'integer',
            'amount_cents' => 'integer',
            'refunded_cents' => 'integer',
            'creation_started_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(MobileWalletAccount::class, 'wallet_account_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(MobileWalletMovement::class, 'recharge_id');
    }
}
