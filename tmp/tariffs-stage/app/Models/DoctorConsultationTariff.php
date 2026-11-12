<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/** Published amounts are immutable. A doctor points to a new version to change the price. */
class DoctorConsultationTariff extends BaseModel
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'doctor_id' => 'integer',
            'version' => 'integer',
            'amount_cents' => 'integer',
            'created_by' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new LogicException('Una tarifa publicada no puede modificarse.');
        });
        static::deleting(function (): never {
            throw new LogicException('Una tarifa publicada debe conservarse.');
        });
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
