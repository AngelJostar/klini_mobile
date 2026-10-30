<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DoctorClinic extends BaseModel
{
    protected function casts(): array { return ['metadata' => 'array']; }
    public function doctor(): BelongsTo { return $this->belongsTo(Doctor::class); }
    public function medicalUnit(): BelongsTo { return $this->belongsTo(MedicalUnit::class); }
    public function availabilityRules(): HasMany { return $this->hasMany(DoctorAvailabilityRule::class); }
}
