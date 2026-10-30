<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalEncounter extends BaseModel
{
    protected function casts(): array
    {
        return ['vital_signs' => 'array', 'background' => 'array', 'metadata' => 'array', 'started_at' => 'datetime', 'completed_at' => 'datetime'];
    }
    public function appointment(): BelongsTo { return $this->belongsTo(Appointment::class); }
    public function patient(): BelongsTo { return $this->belongsTo(Patient::class); }
    public function doctor(): BelongsTo { return $this->belongsTo(Doctor::class); }
    public function medicalUnit(): BelongsTo { return $this->belongsTo(MedicalUnit::class); }
    public function procedureArea(): BelongsTo { return $this->belongsTo(ProcedureArea::class); }
}
