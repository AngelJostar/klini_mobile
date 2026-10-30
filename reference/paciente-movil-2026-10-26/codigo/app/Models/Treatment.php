<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Treatment extends BaseModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'ends_at' => 'date',
            'requires_authorization' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function diagnosis(): BelongsTo
    {
        return $this->belongsTo(PatientDiagnosis::class, 'patient_diagnosis_id');
    }

    public function medication(): BelongsTo
    {
        return $this->belongsTo(Medication::class);
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function prescribingDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'prescribing_doctor_id');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(MedicationDelivery::class);
    }

    public function changeLogs(): HasMany
    {
        return $this->hasMany(TreatmentChangeLog::class);
    }
}
