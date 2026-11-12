<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class MobileWalletMovement extends BaseModel
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = [];

    protected static function booted(): void
    {
        static::creating(function (self $movement): void {
            $recharge = $movement->recharge_id !== null && $movement->service_payment_id === null;
            $service = $movement->recharge_id === null && $movement->service_payment_id !== null;
            $positive = in_array($movement->type, ['recharge', 'service_reversal'], true);
            if (! (($recharge && in_array($movement->type, ['recharge', 'refund'], true))
                || ($service && in_array($movement->type, ['service_payment', 'service_reversal'], true)))
                || ($positive ? $movement->amount_cents <= 0 : $movement->amount_cents >= 0)) {
                throw new LogicException('El movimiento necesita un único origen y un importe con signo válido.');
            }
        });
        static::updating(function (): never {
            throw new LogicException('Un movimiento financiero no puede modificarse.');
        });
        static::deleting(function (): never {
            throw new LogicException('Un movimiento financiero debe conservarse.');
        });
    }

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

    public function servicePayment(): BelongsTo
    {
        return $this->belongsTo(MobileWalletServicePayment::class, 'service_payment_id');
    }

    public function recharge(): BelongsTo
    {
        return $this->belongsTo(MobileWalletRecharge::class, 'recharge_id');
    }
}
