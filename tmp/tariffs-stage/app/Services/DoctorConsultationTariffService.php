<?php

namespace App\Services;

use App\Models\Doctor;
use App\Models\DoctorConsultationTariff;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class DoctorConsultationTariffService
{
    // Initial platform limits, expressed in MXN cents. No default tariff is published.
    public const MIN_AMOUNT_CENTS = 5000;

    public const MAX_AMOUNT_CENTS = 1000000;

    public const MODALITY = 'in_person';

    public const CURRENCY = 'MXN';

    public function parseAmount(string $amount): int
    {
        $amount = trim($amount);
        if (strlen($amount) > 16 || ! preg_match('/^(\d+)(?:[.,](\d{1,2}))?$/D', $amount, $matches)) {
            throw $this->invalidAmount();
        }
        $cents = (int) $matches[1] * 100 + (int) str_pad($matches[2] ?? '', 2, '0');
        if ($cents < self::MIN_AMOUNT_CENTS || $cents > self::MAX_AMOUNT_CENTS) {
            throw $this->invalidAmount();
        }

        return $cents;
    }

    private function invalidAmount(): ValidationException
    {
        return ValidationException::withMessages(['amount' => 'Escribe una tarifa entre $50 y $10,000 MXN, con hasta dos decimales.']);
    }

    private function ownActiveDoctor(User $actor): Doctor
    {
        $allowed = User::query()->whereKey($actor->id)->where('role', 'doctor')->where('status', 'active')->exists();
        abort_unless($allowed, 403);
        $doctor = Doctor::query()->where('user_id', $actor->id)->where('status', 'active')->lockForUpdate()->first();
        abort_unless($doctor, 403);

        return $doctor;
    }

    private function assertExpected(Doctor $doctor, ?int $expectedTariffId): void
    {
        if ($doctor->current_consultation_tariff_id !== $expectedTariffId) {
            throw ValidationException::withMessages(['amount' => 'Tu tarifa cambió. Actualiza el panel antes de continuar.']);
        }
    }

    public function current(Doctor $doctor): ?DoctorConsultationTariff
    {
        if (! $doctor->current_consultation_tariff_id) {
            return null;
        }

        return $doctor->consultationTariffs()->whereKey($doctor->current_consultation_tariff_id)
            ->where('modality', self::MODALITY)->where('currency', self::CURRENCY)->first();
    }

    public function publish(User $actor, string $amount, ?int $expectedTariffId): DoctorConsultationTariff
    {
        $cents = $this->parseAmount($amount);

        return DB::transaction(function () use ($actor, $cents, $expectedTariffId): DoctorConsultationTariff {
            $doctor = $this->ownActiveDoctor($actor);
            $this->assertExpected($doctor, $expectedTariffId);
            $current = $this->current($doctor);
            if ($current && $current->amount_cents === $cents) {
                return $current;
            }
            $version = ((int) $doctor->consultationTariffs()->where('modality', self::MODALITY)->max('version')) + 1;
            $tariff = $doctor->consultationTariffs()->create([
                'version' => $version, 'modality' => self::MODALITY, 'currency' => self::CURRENCY,
                'amount_cents' => $cents, 'created_by' => $actor->id, 'created_at' => now(),
            ]);
            $doctor->update(['current_consultation_tariff_id' => $tariff->id]);

            return $tariff;
        });
    }

    public function withdraw(User $actor, ?int $expectedTariffId): ?DoctorConsultationTariff
    {
        return DB::transaction(function () use ($actor, $expectedTariffId): ?DoctorConsultationTariff {
            $doctor = $this->ownActiveDoctor($actor);
            $this->assertExpected($doctor, $expectedTariffId);
            $current = $this->current($doctor);
            if ($doctor->current_consultation_tariff_id !== null) {
                $doctor->update(['current_consultation_tariff_id' => null]);
            }

            return $current;
        });
    }
}
