<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InsurancePlan extends BaseModel
{
    protected function casts(): array
    {
        return ['details' => 'array', 'is_linked' => 'boolean', 'is_demo' => 'boolean', 'monthly_premium' => 'decimal:2', 'insured_amount' => 'decimal:2', 'deductible' => 'decimal:2', 'coinsurance' => 'decimal:2'];
    }

    public function carrier(): BelongsTo { return $this->belongsTo(InsuranceCarrier::class, 'insurance_carrier_id'); }
    public function documents(): HasMany { return $this->hasMany(InsurancePlanDocument::class); }

    public function scopePublished(Builder $query): void
    {
        $query->where('status', 'active')->where('is_linked', true)
            ->where(fn ($q) => $q->whereNull('insurance_carrier_id')->orWhereHas('carrier', fn ($carrier) => $carrier->where('status', 'active')));
    }
}
