<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use LogicException;

class MobileWalletConsultationQuote extends BaseModel
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = [];

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new LogicException('Una cotización emitida no puede modificarse.');
        });
        static::deleting(function (): never {
            throw new LogicException('Una cotización emitida debe conservarse.');
        });
    }

    protected function casts(): array
    {
        return [
            'wallet_account_id' => 'integer',
            'appointment_id' => 'integer',
            'doctor_id' => 'integer',
            'tariff_id' => 'integer',
            'tariff_version' => 'integer',
            'amount_cents' => 'integer',
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
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

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function tariff(): BelongsTo
    {
        return $this->belongsTo(DoctorConsultationTariff::class, 'tariff_id');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(MobileWalletServicePayment::class, 'quote_id');
    }
}
