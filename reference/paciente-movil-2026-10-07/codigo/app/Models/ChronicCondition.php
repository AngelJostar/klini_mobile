<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChronicCondition extends BaseModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function diagnoses(): HasMany
    {
        return $this->hasMany(PatientDiagnosis::class);
    }
}
