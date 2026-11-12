<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MobileWalletMovement extends BaseModel
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = [];

    protected function casts(): array
    {
        return [
            'wallet_account_id' => 'integer',
            'amount_cents' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(MobileWalletAccount::class, 'wallet_account_id');
    }

    public function recharge(): BelongsTo
    {
        return $this->belongsTo(MobileWalletRecharge::class, 'recharge_id');
    }
}
