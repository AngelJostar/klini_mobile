<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TreatmentChangeLog extends BaseModel
{
    protected function casts(): array
    {
        return [
            'previous_payload' => 'array',
            'new_payload' => 'array',
            'changed_at' => 'datetime',
        ];
    }

    public function treatment(): BelongsTo
    {
        return $this->belongsTo(Treatment::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
