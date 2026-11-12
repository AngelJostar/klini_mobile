<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Doctor extends BaseModel
{
    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function medicalUnit(): BelongsTo
    {
        return $this->belongsTo(MedicalUnit::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function clinicalRecords(): HasMany
    {
        return $this->hasMany(ClinicalRecord::class);
    }

    public function clinics(): HasMany { return $this->hasMany(DoctorClinic::class); }
    public function availabilityRules(): HasMany { return $this->hasMany(DoctorAvailabilityRule::class); }
    public function availabilityExceptions(): HasMany { return $this->hasMany(DoctorAvailabilityException::class); }
    public function clinicalEncounters(): HasMany { return $this->hasMany(ClinicalEncounter::class); }
}
