<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends BaseModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'email_verified_at' => 'datetime',
            'profile_completed_at' => 'datetime',
            'enrolled_at' => 'date',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function clinicalRecords(): HasMany
    {
        return $this->hasMany(ClinicalRecord::class);
    }

    public function clinicalEncounters(): HasMany
    {
        return $this->hasMany(ClinicalEncounter::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(PatientOrder::class);
    }

    public function primaryDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'primary_doctor_id');
    }

    public function insurancePolicies(): HasMany
    {
        return $this->hasMany(InsurancePolicy::class);
    }

    public function diagnoses(): HasMany
    {
        return $this->hasMany(PatientDiagnosis::class);
    }

    public function treatments(): HasMany
    {
        return $this->hasMany(Treatment::class);
    }

    public function medicationDeliveries(): HasMany
    {
        return $this->hasMany(MedicationDelivery::class);
    }

    public function hospitalizations(): HasMany
    {
        return $this->hasMany(Hospitalization::class);
    }

    public function authorizations(): HasMany
    {
        return $this->hasMany(Authorization::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function administeredProfileLinks(): HasMany
    {
        return $this->hasMany(PatientProfileRelationship::class, 'administrator_patient_id');
    }

    public function activeAdministeredProfileLinks(): HasMany
    {
        return $this->administeredProfileLinks()->where('status', 'active');
    }

    public function administeredProfiles(): BelongsToMany
    {
        return $this->belongsToMany(
            Patient::class,
            'patient_profile_relationships',
            'administrator_patient_id',
            'managed_patient_id'
        )
            ->withPivot(['relationship_type_id', 'access_user_id', 'status', 'starts_at', 'ends_at', 'permissions', 'metadata'])
            ->withTimestamps()
            ->wherePivot('status', 'active');
    }

    public function administratorProfileLink(): HasOne
    {
        return $this->hasOne(PatientProfileRelationship::class, 'managed_patient_id')
            ->where('status', 'active');
    }

    public function administratorProfiles(): BelongsToMany
    {
        return $this->belongsToMany(
            Patient::class,
            'patient_profile_relationships',
            'managed_patient_id',
            'administrator_patient_id'
        )
            ->withPivot(['relationship_type_id', 'access_user_id', 'status', 'starts_at', 'ends_at', 'permissions', 'metadata'])
            ->withTimestamps()
            ->wherePivot('status', 'active');
    }
}
