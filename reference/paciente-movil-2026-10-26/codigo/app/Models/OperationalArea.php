<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class OperationalArea extends BaseModel
{
    protected function casts(): array
    {
        return [
            'default_permissions' => 'array',
            'metadata' => 'array',
        ];
    }

    public function profiles(): HasMany
    {
        return $this->hasMany(OperationalProfile::class);
    }
}

