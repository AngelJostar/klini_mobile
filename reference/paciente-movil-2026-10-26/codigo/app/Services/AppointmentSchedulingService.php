<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\ProcedureArea;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class AppointmentSchedulingService
{
    public function availableSlots(
        Doctor $doctor,
        Carbon $from,
        int $days = 21,
        int $durationMinutes = 30,
        int $maxDates = 7,
    ): array {
        $from = $from->copy()->second(0);
        $rules = $doctor->relationLoaded('availabilityRules')
            ? $doctor->availabilityRules->where('status', 'published')->values()
            : $doctor->availabilityRules()->where('status', 'published')->get();
        $exceptions = $doctor->relationLoaded('availabilityExceptions')
            ? $doctor->availabilityExceptions
            : $doctor->availabilityExceptions()->get();
        $appointments = $doctor->relationLoaded('appointments')
            ? $doctor->appointments
            : $doctor->appointments()
                ->whereNotIn('status', ['cancelled'])
                ->whereBetween('starts_at', [$from->copy()->startOfDay(), $from->copy()->addDays($days)->endOfDay()])
                ->get();
        $defaultTimes = ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];
        $availableDates = [];

        for ($offset = 0; $offset < $days && count($availableDates) < $maxDates; $offset++) {
            $date = $from->copy()->startOfDay()->addDays($offset);
            $isBlocked = $exceptions->contains(fn ($exception) => $exception->date_start?->startOfDay()->lte($date)
                && $exception->date_end?->endOfDay()->gte($date));

            if ($isBlocked) {
                continue;
            }

            $candidateTimes = collect();
            if ($rules->isEmpty()) {
                $candidateTimes = collect($defaultTimes);
            } else {
                $rules->filter(fn ($rule) => (int) $rule->weekday === $date->dayOfWeekIso
                    && $rule->recurrence_start?->startOfDay()->lte($date)
                    && (! $rule->recurrence_end || $rule->recurrence_end->endOfDay()->gte($date))
                    && $this->ruleAllowsMonth($rule->selected_months, $date->month))
                    ->each(function ($rule) use ($date, $durationMinutes, $candidateTimes): void {
                        [$startHour, $startMinute] = array_map('intval', explode(':', substr((string) $rule->start_time, 0, 5)));
                        [$endHour, $endMinute] = array_map('intval', explode(':', substr((string) $rule->end_time, 0, 5)));
                        $cursor = $date->copy()->setTime($startHour, $startMinute);
                        $ruleEnd = $date->copy()->setTime($endHour, $endMinute);

                        while ($cursor->copy()->addMinutes($durationMinutes)->lte($ruleEnd)) {
                            $candidateTimes->push($cursor->format('H:i'));
                            $cursor->addHour();
                        }
                    });
            }

            $slots = $candidateTimes->unique()->sort()->map(function (string $time) use ($date, $from, $durationMinutes, $appointments): ?array {
                [$hour, $minute] = array_map('intval', explode(':', $time));
                $startsAt = $date->copy()->setTime($hour, $minute);
                $endsAt = $startsAt->copy()->addMinutes($durationMinutes);

                if ($startsAt->lte($from)) {
                    return null;
                }

                $overlaps = $appointments->whereNotIn('status', ['cancelled'])->contains(function ($appointment) use ($startsAt, $endsAt, $durationMinutes): bool {
                    if (! $appointment->starts_at) {
                        return false;
                    }

                    $appointmentEnd = $appointment->ends_at ?? $appointment->starts_at->copy()->addMinutes($durationMinutes);

                    return $appointment->starts_at->lt($endsAt) && $appointmentEnd->gt($startsAt);
                });

                return $overlaps ? null : [
                    'value' => $startsAt->format('Y-m-d H:i'),
                    'label' => $startsAt->format('H:i'),
                ];
            })->filter()->values();

            if ($slots->isEmpty()) {
                continue;
            }

            $localizedDate = $date->copy()->locale('es');
            $availableDates[] = [
                'date' => $date->toDateString(),
                'weekday' => ucfirst($localizedDate->translatedFormat('D')),
                'day' => $date->format('d'),
                'month' => ucfirst($localizedDate->translatedFormat('F Y')),
                'label' => ucfirst($localizedDate->translatedFormat('l j')).' de '.$localizedDate->translatedFormat('F').' de '.$date->format('Y'),
                'slots' => $slots->all(),
            ];
        }

        return $availableDates;
    }

    public function assertAvailable(Doctor $doctor, Carbon $startsAt, Carbon $endsAt, ?ProcedureArea $room = null, ?int $ignoreAppointmentId = null): void
    {
        $this->assertDoctorSchedule($doctor, $startsAt, $endsAt);
        $this->assertNoDoctorOverlap($doctor, $startsAt, $endsAt, $ignoreAppointmentId);

        if ($room) {
            $this->assertRoomSchedule($room, $startsAt, $endsAt);
            $this->assertRoomCapacity($room, $startsAt, $endsAt, $ignoreAppointmentId);
        }
    }

    public function assertInstitutionalConsultationAvailable(?Doctor $doctor, Carbon $startsAt, Carbon $endsAt, ?ProcedureArea $room = null, ?int $ignoreAppointmentId = null): void
    {
        if ($doctor) {
            $this->assertNoDoctorOverlap($doctor, $startsAt, $endsAt, $ignoreAppointmentId);
        }

        if ($room) {
            $this->assertRoomSchedule($room, $startsAt, $endsAt);
            $this->assertRoomCapacity($room, $startsAt, $endsAt, $ignoreAppointmentId);
        }
    }

    private function assertDoctorSchedule(Doctor $doctor, Carbon $startsAt, Carbon $endsAt): void
    {
        $published = $doctor->availabilityRules()->where('status', 'published');
        if (! $published->exists()) {
            return;
        }

        $available = (clone $published)
            ->where('weekday', $startsAt->dayOfWeekIso)
            ->whereDate('recurrence_start', '<=', $startsAt->toDateString())
            ->where(fn ($query) => $query->whereNull('recurrence_end')->orWhereDate('recurrence_end', '>=', $startsAt->toDateString()))
            ->get()
            ->contains(fn ($rule) => $this->ruleAllowsMonth($rule->selected_months, $startsAt->month)
                && substr((string) $rule->start_time, 0, 5) <= $startsAt->format('H:i')
                && substr((string) $rule->end_time, 0, 5) >= $endsAt->format('H:i'));

        if (! $available) {
            throw ValidationException::withMessages(['starts_at' => 'El médico no tiene disponibilidad publicada para este horario.']);
        }

        $blocked = $doctor->availabilityExceptions()
            ->whereDate('date_start', '<=', $startsAt->toDateString())
            ->whereDate('date_end', '>=', $startsAt->toDateString())
            ->exists();

        if ($blocked) {
            throw ValidationException::withMessages(['starts_at' => 'El médico tiene una ausencia o bloqueo registrado para esta fecha.']);
        }
    }

    private function assertNoDoctorOverlap(Doctor $doctor, Carbon $startsAt, Carbon $endsAt, ?int $ignoreId): void
    {
        $exists = Appointment::query()->where('doctor_id', $doctor->id)
            ->whereNotIn('status', ['cancelled'])
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['starts_at' => 'El médico ya tiene una consulta en ese horario.']);
        }
    }

    private function assertRoomSchedule(ProcedureArea $room, Carbon $startsAt, Carbon $endsAt): void
    {
        if (! $room->schedules()->exists()) {
            return;
        }

        $available = $room->schedules()->where('active', true)->where('day_of_week', $startsAt->dayOfWeek)->get()
            ->contains(fn ($schedule) => substr((string) $schedule->starts_at, 0, 5) <= $startsAt->format('H:i')
                && substr((string) $schedule->ends_at, 0, 5) >= $endsAt->format('H:i'));

        if (! $available) {
            throw ValidationException::withMessages(['procedure_area_id' => 'El consultorio no está habilitado para este horario.']);
        }
    }

    private function assertRoomCapacity(ProcedureArea $room, Carbon $startsAt, Carbon $endsAt, ?int $ignoreId): void
    {
        $simultaneous = Appointment::query()->where('procedure_area_id', $room->id)
            ->whereNotIn('status', ['cancelled'])
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)
            ->count();

        if ($simultaneous >= max(1, $room->simultaneous_capacity)) {
            throw ValidationException::withMessages(['procedure_area_id' => 'El consultorio alcanzó su capacidad para este horario.']);
        }
    }

    private function ruleAllowsMonth(?array $selectedMonths, int $month): bool
    {
        $months = $selectedMonths ?: range(1, 12);

        return in_array($month, array_map('intval', $months), true);
    }
}
