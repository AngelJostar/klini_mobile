<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class PatientProfileRelationshipType extends BaseModel
{
    protected function casts(): array
    {
        return [
            'requires_administrator' => 'boolean',
            'allows_independent_login' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function relationships(): HasMany
    {
        return $this->hasMany(PatientProfileRelationship::class, 'relationship_type_id');
    }
}
