<?php

namespace App\Http\Controllers\Operational;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentStatusEvent;
use App\Models\Doctor;
use App\Models\MedicalUnit;
use App\Models\OperationalProfile;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\MedicationCatalogItem;
use App\Models\ProcedureArea;
use App\Services\Platform\PlatformAuditService;
use App\Services\Platform\DomainStateTransitionService;
use App\Services\AppointmentSchedulingService;
use App\Services\PrescriptionPharmacyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class OutpatientDashboardController extends Controller
{
    public function index(Request $request): View|RedirectResponse
    {
        $section = $request->string('section')->toString() ?: 'agenda';
        abort_unless(in_array($section, ['agenda', 'prescriptions', 'patients', 'rooms'], true), 404);

        $unit = $this->contextUnit($request);
        if ($section === 'patients') {
            return redirect()->route('operational.patients.index', $unit ? ['unit' => $unit->id] : []);
        }

        $search = $request->string('search')->toString();

        $appointments = Appointment::query()
            ->with(['patient', 'doctor'])
            ->when($unit, fn ($query) => $query->where('medical_unit_id', $unit->id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($search, fn ($query) => $query->where(function ($nested) use ($search): void {
                $nested->where('specialty', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhereHas('patient', fn ($patientQuery) => $patientQuery->where('full_name', 'like', "%{$search}%"))
                    ->orWhereHas('doctor', fn ($doctorQuery) => $doctorQuery->where('full_name', 'like', "%{$search}%"));
            }))
            ->orderBy('starts_at')
            ->limit(100)
            ->get();

        $patients = Patient::query()->orderBy('full_name')->limit(100)->get();
        $doctors = Doctor::query()->with(['availabilityRules' => fn ($query) => $query->where('status', 'published')])->when($unit, fn ($query) => $query->where('medical_unit_id', $unit->id))->orderBy('full_name')->get();
        $prescriptions = Prescription::query()
            ->with(['patient', 'doctor', 'items.medication'])
            ->when($unit, fn ($query) => $query->where(function ($scoped) use ($unit): void {
                $scoped->whereHas('doctor', fn ($doctor) => $doctor->where('medical_unit_id', $unit->id))
                    ->orWhere('metadata->medical_unit_id', $unit->id);
            }))
            ->latest('issued_at')->limit(100)->get();
        $medications = MedicationCatalogItem::query()->where('status', 'active')->orderBy('generic_name')->limit(500)->get();
        $rooms = $unit?->procedureAreas()
            ->with('schedules')
            ->where('type', 'consulting')
            ->orderBy('unit_number')
            ->get()
            ->map(fn (ProcedureArea $room) => [
                'database_id' => $room->id,
                'id' => $room->external_id ?: $room->id,
                'number' => $room->unit_number,
                'name' => data_get($room->metadata, 'name', $room->responsible_name ?: $room->unit_number),
                'location' => $room->location,
                'floor' => $room->floor,
                'capacity' => $room->simultaneous_capacity,
                'status' => $room->status,
                'specialty' => data_get($room->metadata, 'specialty', 'Consulta externa'),
                'modality' => data_get($room->metadata, 'modality', 'Presencial'),
                'slot_durations' => data_get($room->metadata, 'slot_durations', []),
                'availability_ranges' => data_get($room->metadata, 'availability_ranges', []),
                'schedule' => $room->schedules->map(fn ($schedule) => [
                    'day' => $schedule->day_of_week,
                    'start' => substr((string) $schedule->starts_at, 0, 5),
                    'end' => substr((string) $schedule->ends_at, 0, 5),
                ]),
            ]);

        if ($rooms?->isEmpty()) {
            $rooms = collect(data_get($unit?->metadata, 'procedure_areas', []))
                ->filter(fn ($room) => in_array(data_get($room, 'type'), ['consulting', 'consultation', 'consultorio'], true))
                ->values();
        }

        return view('operational.outpatient', compact('section', 'unit', 'appointments', 'patients', 'doctors', 'prescriptions', 'medications', 'rooms'));
    }

    public function storeAppointment(Request $request, PlatformAuditService $audit, AppointmentSchedulingService $scheduling): RedirectResponse
    {
        if ($request->filled('appointment_date') && $request->filled('appointment_time')) {
            $request->merge(['starts_at' => $request->string('appointment_date')->toString().' '.$request->string('appointment_time')->toString()]);
        }
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['required', 'exists:doctors,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'specialty' => ['required', 'string', 'max:160'],
            'location' => ['required', 'string', 'max:160'],
            'procedure_area_id' => ['nullable', 'integer', 'exists:procedure_areas,id'],
            'modality' => ['required', Rule::in(['Presencial', 'Video llamada'])],
            'starts_at' => ['required', 'date'],
            'duration' => ['required', 'integer', Rule::in([20, 30, 45, 60])],
            'reason' => ['required', Rule::in(['Primera Vez', 'Seguimiento'])],
        ]);

        $unit = $this->contextUnit($request);
        $room = null;
        if (! empty($data['procedure_area_id'])) {
            $room = ProcedureArea::query()->whereKey($data['procedure_area_id'])->where('medical_unit_id', $unit?->id)->firstOrFail();
            $data['location'] = $room->unit_number ?: $room->location;
        }

        $duration = (int) $data['duration'];
        unset($data['duration']);
        $startsAt = Carbon::parse($data['starts_at']);
        $endsAt = $startsAt->copy()->addMinutes($duration);
        $doctor = Doctor::query()->findOrFail($data['doctor_id']);
        abort_unless(! $unit || $doctor->medical_unit_id === $unit->id, 404);
        $scheduling->assertAvailable($doctor, $startsAt, $endsAt, $room);

        $appointment = Appointment::query()->create([
            ...$data,
            'medical_unit_id' => $unit?->id,
            'status' => 'scheduled',
            'ends_at' => $endsAt,
            'metadata' => ['source' => 'outpatient_operational_module'],
        ]);

        $audit->record($request, 'outpatient.appointment.created', $appointment, 'operational');

        return redirect()->route('outpatient.dashboard', ['unit' => $unit?->id])->with('status', 'Consulta agregada a la agenda.');
    }

    public function updateAppointment(Request $request, Appointment $appointment, PlatformAuditService $audit, DomainStateTransitionService $transitions): RedirectResponse
    {
        if (! in_array($request->user()?->role, ['superadmin', 'admin'], true)) {
            $unit = $this->contextUnit($request);
            abort_unless($unit && (int) $appointment->medical_unit_id === (int) $unit->id, 403, 'No puedes modificar citas de otra unidad.');
        }
        $data = $request->validate(['status' => ['required', Rule::in(['scheduled', 'in_progress', 'completed', 'cancelled'])]]);
        $previousStatus = $appointment->status;
        $transitions->assertAllowed('appointment', $previousStatus, $data['status']);

        DB::transaction(function () use ($appointment, $data, $request, $transitions): void {
            $appointment = Appointment::query()->whereKey($appointment->id)->lockForUpdate()->firstOrFail();
            if (! in_array($request->user()?->role, ['superadmin', 'admin'], true)) {
                $unit = $this->contextUnit($request);
                abort_unless($unit && (int) $appointment->medical_unit_id === (int) $unit->id, 403, 'No puedes modificar citas de otra unidad.');
            }
            $previousStatus = $appointment->status;
            $transitions->assertAllowed('appointment', $previousStatus, $data['status']);
            $appointment->update($data);
            AppointmentStatusEvent::query()->create([
                'appointment_id' => $appointment->id,
                'changed_by' => $request->user()?->id,
                'from_status' => $previousStatus,
                'to_status' => $data['status'],
                'metadata' => ['source' => 'outpatient'],
            ]);
        });
        $audit->record($request, 'outpatient.appointment.updated', $appointment, 'operational', $data);

        return back()->with('status', 'Estado de la consulta actualizado.');
    }

    public function storePatient(Request $request, PlatformAuditService $audit): RedirectResponse
    {
        $data = $this->validatePatient($request);
        $unit = $this->contextUnit($request);
        $patient = Patient::query()->create($this->patientPayload($data, medicalUnitId: $unit?->id));
        $audit->record($request, 'outpatient.patient.created', $patient, 'operational');

        return redirect()->route('operational.patients.index', $unit ? ['unit' => $unit->id] : [])->with('status', 'Paciente registrado correctamente.');
    }

    public function updatePatient(Request $request, Patient $patient, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->contextUnit($request);
        abort_unless($unit && \App\Support\UnitPatientCatalog::query($unit)->whereKey($patient->id)->exists(), 404);
        $data = $this->validatePatient($request, $patient);
        $patient->update($this->patientPayload($data, $patient, $unit?->id));
        $audit->record($request, 'outpatient.patient.updated', $patient, 'operational');

        return redirect()->route('operational.patients.index', $unit ? ['unit' => $unit->id] : [])->with('status', 'Paciente actualizado correctamente.');
    }

    public function storeRoom(Request $request, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->contextUnit($request);
        abort_unless($unit, 404);
        $data = $this->validateRoom($request, $unit);

        $room = DB::transaction(function () use ($unit, $data): ProcedureArea {
            $room = $unit->procedureAreas()->create($this->roomPayload($data));
            $this->persistRoomSchedule($room, $data['schedule'] ?? [], $data['availability_ranges'] ?? []);

            return $room;
        });
        $audit->record($request, 'outpatient.room.created', $room, 'operational');

        return redirect()->route('outpatient.dashboard', ['unit' => $unit?->id, 'section' => 'rooms'])->with('status', 'Consultorio registrado correctamente.');
    }

    public function updateRoom(Request $request, ProcedureArea $room, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->contextUnit($request);
        abort_unless($unit && $room->medical_unit_id === $unit->id && $room->type === 'consulting', 404);
        $data = $this->validateRoom($request, $unit, $room);

        DB::transaction(function () use ($room, $data): void {
            $room->update($this->roomPayload($data, $room));
            $this->persistRoomSchedule($room, $data['schedule'] ?? [], $data['availability_ranges'] ?? []);
        });
        $audit->record($request, 'outpatient.room.updated', $room, 'operational');

        return redirect()->route('outpatient.dashboard', ['unit' => $unit?->id, 'section' => 'rooms'])->with('status', 'Consultorio actualizado correctamente.');
    }

    public function destroyRoom(Request $request, ProcedureArea $room, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->contextUnit($request);
        abort_unless($unit && $room->medical_unit_id === $unit->id && $room->type === 'consulting', 404);

        if ($room->appointments()->exists()) {
            return redirect()
                ->route('outpatient.dashboard', ['unit' => $unit?->id, 'section' => 'rooms'])
                ->withErrors(['room' => 'El consultorio tiene consultas asociadas. EdÃ­talo o inactÃ­valo para conservar el historial.']);
        }

        $audit->record($request, 'outpatient.room.deleted', $room, 'operational');
        $room->delete();

        return redirect()
            ->route('outpatient.dashboard', ['unit' => $unit?->id, 'section' => 'rooms'])
            ->with('status', 'Consultorio eliminado correctamente.');
    }

    public function updateCalendar(Request $request, ProcedureArea $room, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->contextUnit($request);
        abort_unless($unit && $room->medical_unit_id === $unit->id && $room->type === 'consulting', 404);
        $data = $request->validate([
            'day_of_week' => ['required', 'integer', 'between:1,5'],
            'specialty' => ['required', 'string', 'max:160'],
            'starts_at' => ['required', 'date_format:H:i'],
            'ends_at' => ['required', 'date_format:H:i', 'after:starts_at'],
            'duration' => ['required', 'integer', Rule::in([20, 30, 45, 60])],
        ]);

        DB::transaction(function () use ($room, $data): void {
            $room->schedules()->where('day_of_week', $data['day_of_week'])->delete();
            $room->schedules()->create(['day_of_week' => $data['day_of_week'], 'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'], 'active' => true]);
            $metadata = $room->metadata ?? [];
            $metadata['specialty'] = $data['specialty'];
            $metadata['slot_durations'][(string) $data['day_of_week']] = $data['duration'];
            $room->update(['metadata' => $metadata]);
        });
        $audit->record($request, 'outpatient.calendar.updated', $room, 'operational', $data);

        return redirect()->route('outpatient.dashboard', ['unit' => $unit?->id, 'admin' => 1])->with('status', 'Calendario del consultorio actualizado.');
    }

    public function storePrescription(Request $request, PlatformAuditService $audit, PrescriptionPharmacyService $pharmacy): RedirectResponse
    {
        $unit = $this->contextUnit($request);
        $data = $this->validatePrescription($request);
        $doctor = Doctor::query()->findOrFail($data['doctor_id']);
        abort_unless(! $unit || $doctor->medical_unit_id === $unit->id, 404);
        $appointment = $this->authorizedPrescriptionAppointment($data, $unit);

        $prescription = DB::transaction(function () use ($data, $unit, $appointment): Prescription {
            $prescription = Prescription::query()->create($this->prescriptionPayload($data, $unit, null, $appointment));
            $this->persistPrescriptionItems($prescription, $data['items']);
            return $prescription;
        });
        $pharmacy->sync($prescription);
        $audit->record($request, 'outpatient.prescription.created', $prescription, 'operational');

        return redirect()->route('outpatient.dashboard', ['unit' => $unit?->id, 'section' => 'prescriptions'])->with('status', 'Receta emitida correctamente.');
    }

    public function updatePrescription(Request $request, Prescription $prescription, PlatformAuditService $audit, PrescriptionPharmacyService $pharmacy): RedirectResponse
    {
        $unit = $this->contextUnit($request);
        abort_unless(! $unit || $prescription->doctor?->medical_unit_id === $unit->id || (int) data_get($prescription->metadata, 'medical_unit_id') === $unit->id, 404);
        $data = $this->validatePrescription($request, $prescription);
        $doctor = Doctor::query()->findOrFail($data['doctor_id']);
        abort_unless(! $unit || $doctor->medical_unit_id === $unit->id, 404);
        $appointment = $this->authorizedPrescriptionAppointment($data, $unit);

        DB::transaction(function () use ($prescription, $data, $unit, $appointment): void {
            $prescription->update($this->prescriptionPayload($data, $unit, $prescription, $appointment));
            $prescription->items()->delete();
            $this->persistPrescriptionItems($prescription, $data['items']);
        });
        $pharmacy->sync($prescription->fresh('items'));
        $audit->record($request, 'outpatient.prescription.updated', $prescription, 'operational');

        return redirect()->route('outpatient.dashboard', ['unit' => $unit?->id, 'section' => 'prescriptions'])->with('status', 'Receta actualizada correctamente.');
    }

    private function validatePrescription(Request $request, ?Prescription $prescription = null): array
    {
        return $request->validate([
            'code' => ['nullable', 'string', 'max:80', Rule::unique('prescriptions', 'code')->ignore($prescription)],
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['required', 'exists:doctors,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'issued_at' => ['required', 'date'],
            'status' => ['required', Rule::in(['active', 'pending', 'filled', 'cancelled'])],
            'diagnosis' => ['required', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.medication_catalog_item_id' => ['nullable', 'exists:medication_catalog_items,id'],
            'items.*.medication_name' => ['required', 'string', 'max:255'],
            'items.*.cnis' => ['nullable', 'string', 'max:100'],
            'items.*.dose' => ['nullable', 'string', 'max:120'],
            'items.*.presentation' => ['nullable', 'string', 'max:160'],
            'items.*.route' => ['nullable', 'string', 'max:100'],
            'items.*.frequency' => ['nullable', 'string', 'max:120'],
            'items.*.duration' => ['nullable', 'string', 'max:120'],
            'items.*.quantity' => ['nullable', 'string', 'max:80'],
            'items.*.instructions' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function prescriptionPayload(array $data, ?MedicalUnit $unit, ?Prescription $prescription = null, ?Appointment $appointment = null): array
    {
        $metadata = [
            ...($prescription?->metadata ?? []),
            'medical_unit_id' => $unit?->id,
            'diagnosis' => $data['diagnosis'],
            'source' => 'outpatient_module',
        ];

        if ($appointment) {
            $metadata['appointment_id'] = $appointment->id;
            $metadata['procedure_area_id'] = $appointment->procedure_area_id;
            $metadata['operational_status'] = $metadata['operational_status'] ?? 'pending_review';
        }

        return [
            'patient_id' => $data['patient_id'], 'doctor_id' => $data['doctor_id'],
            'code' => ($data['code'] ?? null) ?: ($prescription?->code ?: 'RX-'.now()->format('YmdHis').'-'.random_int(10, 99)),
            'status' => $data['status'], 'issued_at' => $data['issued_at'], 'notes' => $data['notes'] ?? null,
            'metadata' => $metadata,
        ];
    }


    private function authorizedPrescriptionAppointment(array $data, ?MedicalUnit $unit): ?Appointment
    {
        if (empty($data['appointment_id'])) {
            return null;
        }

        $appointment = Appointment::query()
            ->whereKey($data['appointment_id'])
            ->where('patient_id', $data['patient_id'])
            ->where('doctor_id', $data['doctor_id'])
            ->when($unit, fn ($query) => $query->where('medical_unit_id', $unit->id))
            ->first();

        abort_unless($appointment, 422, 'La cita seleccionada no corresponde al paciente, medico o unidad indicados.');

        return $appointment;
    }
    private function persistPrescriptionItems(Prescription $prescription, array $items): void
    {
        foreach ($items as $item) {
            $prescription->items()->create([
                'medication_catalog_item_id' => $item['medication_catalog_item_id'] ?? null,
                'medication_name' => $item['medication_name'], 'dose' => $item['dose'] ?? null,
                'frequency' => $item['frequency'] ?? null, 'duration' => $item['duration'] ?? null,
                'instructions' => $item['instructions'] ?? null,
                'metadata' => collect($item)->only(['cnis', 'presentation', 'route', 'quantity'])->all(),
            ]);
        }
    }

    private function validateRoom(Request $request, MedicalUnit $unit, ?ProcedureArea $room = null): array
    {
        if (is_string($request->input('availability_ranges'))) {
            $request->merge(['availability_ranges' => json_decode($request->string('availability_ranges')->toString(), true) ?: []]);
        }

        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:80', Rule::unique('procedure_areas', 'unit_number')->where('medical_unit_id', $unit->id)->ignore($room)],
            'location' => ['required', 'string', 'max:180'],
            'specialty' => ['required', 'string', 'max:160'],
            'modality' => ['required', Rule::in(['Presencial', 'Video llamada'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'capacity' => ['required', 'integer', 'min:1', 'max:99'],
            'schedule' => ['nullable', 'array'],
            'schedule.*.enabled' => ['nullable', 'boolean'],
            'schedule.*.start' => ['nullable', 'date_format:H:i'],
            'schedule.*.end' => ['nullable', 'date_format:H:i', 'after:schedule.*.start'],
            'availability_ranges' => ['nullable', 'array', 'max:366'],
            'availability_ranges.*.date' => ['required', 'date_format:Y-m-d'],
            'availability_ranges.*.start' => ['required', 'date_format:H:i'],
            'availability_ranges.*.end' => ['required', 'date_format:H:i'],
            'availability_ranges.*.duration' => ['required', 'integer', Rule::in([20, 30, 45, 60])],
            'availability_ranges.*.modality' => ['required', Rule::in(['Presencial', 'Video llamada'])],
        ]);
    }

    private function roomPayload(array $data, ?ProcedureArea $room = null): array
    {
        return [
            'type' => 'consulting',
            'external_id' => $data['code'],
            'location' => $data['location'],
            'floor' => data_get($room?->metadata, 'floor', 'PB'),
            'unit_number' => $data['code'],
            'simultaneous_capacity' => $data['capacity'],
            'responsible_name' => $data['name'],
            'status' => $data['status'],
            'metadata' => [...($room?->metadata ?? []), 'name' => $data['name'], 'specialty' => $data['specialty'], 'modality' => $data['modality'], 'availability_ranges' => array_values($data['availability_ranges'] ?? [])],
        ];
    }

    private function persistRoomSchedule(ProcedureArea $room, array $schedule, array $availabilityRanges = []): void
    {
        $days = ['sunday' => 0, 'monday' => 1, 'tuesday' => 2, 'wednesday' => 3, 'thursday' => 4, 'friday' => 5, 'saturday' => 6];
        $room->schedules()->delete();
        if ($availabilityRanges !== []) {
            collect($availabilityRanges)
                ->map(fn (array $range) => [
                    'day_of_week' => \Carbon\Carbon::parse($range['date'])->dayOfWeek,
                    'starts_at' => $range['start'],
                    'ends_at' => $range['end'],
                ])
                ->unique(fn (array $range) => implode('|', $range))
                ->each(fn (array $range) => $room->schedules()->create([...$range, 'active' => true]));

            return;
        }
        foreach ($schedule as $day => $range) {
            if (! ($range['enabled'] ?? false) || ! isset($days[$day], $range['start'], $range['end'])) continue;
            $room->schedules()->create(['day_of_week' => $days[$day], 'starts_at' => $range['start'], 'ends_at' => $range['end'], 'active' => true]);
        }
    }

    private function validatePatient(Request $request, ?Patient $patient = null): array
    {
        return $request->validate([
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:160'],
            'age' => ['required', 'integer', 'between:0,130'],
            'curp' => ['required', 'string', 'max:18', Rule::unique('patients', 'curp')->ignore($patient)],
            'nss_federal' => ['nullable', 'string', 'max:40'],
            'nss_estatal' => ['nullable', 'string', 'max:40'],
            'platform_number' => ['nullable', 'string', 'max:80', Rule::unique('patients', 'platform_number')->ignore($patient)],
            'state' => ['required', 'string', 'max:100'],
        ]);
    }

    private function patientPayload(array $data, ?Patient $patient = null, ?int $medicalUnitId = null): array
    {
        return [
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'full_name' => trim($data['first_name'].' '.$data['last_name']),
            'birth_date' => now()->subYears((int) $data['age'])->startOfYear()->toDateString(),
            'curp' => strtoupper($data['curp']),
            'platform_number' => $data['platform_number'] ?: null,
            'status' => $patient?->status ?? 'active',
            'metadata' => [
                ...($patient?->metadata ?? []),
                'nss_federal' => $data['nss_federal'] ?? null,
                'nss_estatal' => $data['nss_estatal'] ?? null,
                'state' => $data['state'],
                'medical_unit_id' => data_get($patient?->metadata, 'medical_unit_id') ?? $medicalUnitId,
                'source' => 'outpatient_module',
            ],
        ];
    }

    private function contextUnit(Request $request): ?MedicalUnit
    {
        return \App\Support\OperationalUnitContext::resolve($request);
    }
}
