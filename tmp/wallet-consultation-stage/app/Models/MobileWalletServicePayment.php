<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MobileWalletServicePayment extends BaseModel
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = [];

    protected function casts(): array
    {
        return [
            'wallet_account_id' => 'integer',
            'appointment_id' => 'integer',
            'amount_cents' => 'integer',
            'paid_at' => 'datetime',
            'reversed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(MobileWalletAccount::class, 'wallet_account_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(MobileWalletConsultationQuote::class, 'quote_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(MobileWalletMovement::class, 'service_payment_id');
    }
}
