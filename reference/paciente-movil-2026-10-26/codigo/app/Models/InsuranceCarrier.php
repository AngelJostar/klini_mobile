<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class InsuranceCarrier extends BaseModel
{
    public function plans(): HasMany
    {
        return $this->hasMany(InsurancePlan::class);
    }

    public function coverageLabel(): string
    {
        $categories = [];
        if ($this->gmm_plans_count > 0) $categories[] = 'GMM';
        if ($this->life_plans_count > 0) $categories[] = 'Vida';

        return $categories ? implode(' y ', $categories) : ($this->type ?: 'Por definir');
    }

    protected $fillable = [
        'name',
        'slug',
        'type',
        'contact',
        'phone',
        'email',
        'scope',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }
}
