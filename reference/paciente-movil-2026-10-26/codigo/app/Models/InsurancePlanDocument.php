<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsurancePlanDocument extends BaseModel
{
    public function plan(): BelongsTo { return $this->belongsTo(InsurancePlan::class, 'insurance_plan_id'); }
}
