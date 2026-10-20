<?php

namespace App\Services\Platform;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PlatformAuditService
{
    public function record(Request $request, string $event, Model $model, string $module, array $context = []): void
    {
        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => $event,
            'auditable_type' => $model::class,
            'auditable_id' => $model->getKey(),
            'ip_address' => $request->ip(),
            'payload' => [
                'module' => $module,
                'changed_fields' => array_keys($model->getChanges()),
                'context' => $context,
            ],
        ]);
    }
}
