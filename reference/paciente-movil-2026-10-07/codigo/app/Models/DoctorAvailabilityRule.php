<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorAvailabilityRule extends BaseModel
{
    protected function casts(): array
    {
        return ['recurrence_start' => 'date', 'recurrence_end' => 'date', 'selected_months' => 'array', 'metadata' => 'array', 'published_at' => 'datetime'];
    }
    public function doctor(): BelongsTo { return $this->belongsTo(Doctor::class); }
    public function clinic(): BelongsTo { return $this->belongsTo(DoctorClinic::class, 'doctor_clinic_id'); }
}
