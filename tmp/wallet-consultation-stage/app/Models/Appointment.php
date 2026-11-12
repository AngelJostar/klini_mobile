<?php

namespace App\Models;

use App\Services\Platform\DomainStateTransitionService;
use App\Services\Wallet\MobileWalletConsultationService;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class Appointment extends BaseModel
{
    public function save(array $options = [])
    {
        $fields = [...MobileWalletConsultationService::MATERIAL_FIELDS, 'status'];
        if (! $this->exists || ! $this->isDirty($fields)
            || ! Schema::connection($this->getConnectionName())->hasTable('mobile_wallet_service_payments')) {
            return parent::save($options);
        }

        $attributes = $this->getAttributes();
        $original = $this->getRawOriginal();
        try {
            return $this->getConnection()->transaction(function () use ($options) {
            $changes = $this->getDirty();
            $fresh = $this->newQuery()->whereKey($this->getKey())->lockForUpdate()->firstOrFail();
            // Rebase only the caller's actual changes; a stale model must not restore an earlier status or schedule.
            $this->setRawAttributes($fresh->getAttributes(), true);
            $this->setRawAttributes(array_replace($fresh->getAttributes(), $changes));
            $actual = $this->getDirty();
            $wallet = app(MobileWalletConsultationService::class);
            $wallet->guardMutation($fresh, $actual);
            if (array_key_exists('status', $actual)) {
                app(DomainStateTransitionService::class)->assertAllowed('appointment', $fresh->status, $actual['status']);
            }
            $saved = parent::save($options);
            if ($saved) {
                // Synchronous and in this same SQL transaction: a failed reversal rolls back the status change.
                $wallet->reverseCancelled($this);
            }

            return $saved;
            });
        } catch (\Throwable $exception) {
            // Preserve the caller's unsaved changes if SQL rolled back, so retrying this same instance remains safe.
            $this->setRawAttributes($original, true);
            $this->setRawAttributes($attributes);
            throw $exception;
        }
    }

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function medicalUnit(): BelongsTo
    {
        return $this->belongsTo(MedicalUnit::class);
    }

    public function procedureArea(): BelongsTo
    {
        return $this->belongsTo(ProcedureArea::class);
    }

    public function statusEvents(): HasMany
    {
        return $this->hasMany(AppointmentStatusEvent::class);
    }

    public function clinicalEncounters(): HasMany
    {
        return $this->hasMany(ClinicalEncounter::class);
    }
}
