<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class HospitalizationDailyNote extends BaseModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'note_date' => 'date',
            'possible_discharge_date' => 'date',
            'prolonged_stay_risk' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function hospitalization(): BelongsTo
    {
        return $this->belongsTo(Hospitalization::class);
    }

    public function capturedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'captured_by');
    }
}
