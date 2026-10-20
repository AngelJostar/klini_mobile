<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientProfileRelationship extends BaseModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'permissions' => 'array',
            'metadata' => 'array',
        ];
    }

    public function administratorProfile(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'administrator_patient_id');
    }

    public function managedProfile(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'managed_patient_id');
    }

    public function relationshipType(): BelongsTo
    {
        return $this->belongsTo(PatientProfileRelationshipType::class, 'relationship_type_id');
    }

    public function accessUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'access_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
