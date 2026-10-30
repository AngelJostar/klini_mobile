<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorAvailabilityException extends BaseModel
{
    protected function casts(): array { return ['date_start' => 'date', 'date_end' => 'date', 'all_day' => 'boolean', 'metadata' => 'array']; }
    public function doctor(): BelongsTo { return $this->belongsTo(Doctor::class); }
    public function clinic(): BelongsTo { return $this->belongsTo(DoctorClinic::class, 'doctor_clinic_id'); }
}
