<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcedureAreaSchedule extends BaseModel
{
    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function procedureArea(): BelongsTo
    {
        return $this->belongsTo(ProcedureArea::class);
    }
}
