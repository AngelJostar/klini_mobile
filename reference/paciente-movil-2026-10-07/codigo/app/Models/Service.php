<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends BaseModel
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function contractedServices(): HasMany
    {
        return $this->hasMany(ContractedService::class);
    }
}

