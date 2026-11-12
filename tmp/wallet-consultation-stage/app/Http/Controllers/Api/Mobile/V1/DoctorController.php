<?php

namespace App\Http\Controllers\Api\Mobile\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentStatusEvent;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Provider;
use App\Models\ProviderRequest;
use App\Models\ProviderRequestStatusEvent;
use App\Services\Platform\DomainStateTransitionService;
use App\Services\Platform\PlatformAuditService;
use App\Services\PrescriptionPharmacyService;
use App\Support\MobileApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DoctorController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $doctor = $this->doctor($request);
        $patients = $this->authorizedPatients($doctor);

        return MobileApiResponse::success(['summary' => [
            'appointments_today' => $doctor->appointments()->whereDate('starts_at', today())->count(),
            'upcoming_appointments' => $doctor->appointments()->where('starts_at', '>=', now())->whereNotIn('status', ['cancelled', 'completed'])->count(),
            'authorized_patients' => (clone $patients)->count(),
            'pending_prescriptions' => $doctor->prescriptions()->where('status', 'pending')->count(),
            'active_requests' => ProviderRequest::query()->where('payload->doctor_id', $doctor->id)->whereNotIn('status', ['completed', 'cancelled', 'rejected'])->count(),
        ]]);
    }

    public function appointments(Request $request): JsonResponse
    {
        $paginator = $this->doctor($request)->appointments()
            ->with(['patient:id,full_name,platform_number', 'medicalUnit:id,name,address'])
            ->when($request->filled('date'), fn ($query) => $query->whereDate('starts_at', $request->string('date')->toString()))
            ->latest('starts_at')
            ->paginate($this->perPage($request));

        return $this->paginated($paginator, fn (Appointment $appointment): array => $this->appointmentData($appointment));
    }

    public function appointment(Request $request, int $appointment): JsonResponse
    {
        $model = $this->doctor($request)->appointments()
            ->with(['patient:id,full_name,platform_number', 'medicalUnit:id,name,address'])
            ->findOrFail($appointment);

        return MobileApiResponse::success(['appointment' => $this->appointmentData($model)]);
    }

    private function appointmentData(Appointment $appointment): array
    {
        return [
            'id' => $appointment->id,
            'status' => $appointment->status,
            'specialty' => $appointment->specialty,
            'modality' => $appointment->modality,
            'location' => $appointment->location,
            'starts_at' => $appointment->starts_at?->toIso8601String(),
            'ends_at' => $appointment->ends_at?->toIso8601String(),
            'reason' => $appointment->reason,
            'patient' => $appointment->patient ? [
                'id' => $appointment->patient->id,
                'name' => $appointment->patient->full_name,
                'platform_number' => $appointment->patient->platform_number,
            ] : null,
            'medical_unit' => $appointment->medicalUnit ? [
                'id' => $appointment->medicalUnit->id,
                'name' => $appointment->medicalUnit->name,
                'address' => $appointment->medicalUnit->address,
            ] : null,
        ];
    }

    public function updateAppointment(Request $request, int $appointment, DomainStateTransitionService $transitions, PlatformAuditService $audit): JsonResponse
    {
        $doctor = $this->doctor($request);
        $model = $doctor->appointments()->findOrFail($appointment);
        $data = $request->validate(['status' => ['required', Rule::in(['scheduled', 'in_progress', 'completed', 'cancelled'])]]);
        $previous = $model->status;
        $transitions->assertAllowed('appointment', $previous, $data['status']);

        DB::transaction(function () use (&$model, $data, $request, &$previous, $doctor, $transitions): void {
            $model = Appointment::query()->whereKey($model->id)->lockForUpdate()->firstOrFail();
            abort_unless((int) $model->doctor_id === (int) $doctor->id, 404);
            $previous = $model->status;
            $transitions->assertAllowed('appointment', $previous, $data['status']);
            $model->update(['status' => $data['status']]);
            AppointmentStatusEvent::query()->create([
                'appointment_id' => $model->id,
                'changed_by' => $request->user()->id,
                'from_status' => $previous,
                'to_status' => $data['status'],
                'metadata' => ['source' => 'klini_mobile'],
            ]);
        });
        $audit->record($request, 'mobile.doctor.appointment.updated', $model, 'doctor', ['from' => $previous, 'to' => $data['status']]);

        return MobileApiResponse::success(['appointment' => ['id' => $model->id, 'status' => $model->status]]);
    }

    public function patients(Request $request): JsonResponse
    {
        $doctor = $this->doctor($request);
        $paginator = $this->authorizedPatients($doctor)
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $request->string('search')->toString()).'%';
                $query->where(fn ($scope) => $scope->where('full_name', 'like', $search)->orWhere('platform_number', 'like', $search));
            })
            ->orderBy('full_name')
            ->paginate($this->perPage($request));

        return $this->paginated($paginator, fn (Patient $patient): array => $this->patientSummary($patient));
    }

    public function patient(Request $request, int $patient, PlatformAuditService $audit): JsonResponse
    {
        $doctor = $this->doctor($request);
        $model = $this->authorizedPatients($doctor)->findOrFail($patient);
        $model->load([
            'appointments' => fn ($query) => $query->where('doctor_id', $doctor->id)->latest('starts_at'),
            'clinicalRecords' => fn ($query) => $query->where('doctor_id', $doctor->id)->latest('recorded_at'),
            'prescriptions' => fn ($query) => $query->where('doctor_id', $doctor->id)->with('items')->latest('issued_at'),
        ]);
        $audit->record($request, 'mobile.doctor.patient.viewed', $model, 'doctor');

        return MobileApiResponse::success([
            'patient' => [
                ...$this->patientSummary($model),
                'birth_date' => $model->birth_date?->toDateString(),
                'sex' => $model->sex,
                'phone' => $model->phone,
                'email' => $model->email,
                'appointments' => $model->appointments->map(fn ($item) => ['id' => $item->id, 'status' => $item->status, 'starts_at' => $item->starts_at?->toIso8601String()])->values(),
                'clinical_records' => $model->clinicalRecords->map(fn ($item) => ['id' => $item->id, 'type' => $item->record_type, 'title' => $item->title, 'summary' => $item->summary, 'recorded_at' => $item->recorded_at?->toIso8601String()])->values(),
                'prescriptions' => $model->prescriptions->map(fn ($item) => ['id' => $item->id, 'code' => $item->code, 'status' => $item->status, 'issued_at' => $item->issued_at?->toIso8601String()])->values(),
            ],
        ]);
    }

    public function storeClinicalRecord(Request $request, int $patient, PlatformAuditService $audit): JsonResponse
    {
        $doctor = $this->doctor($request);
        $model = $this->authorizedPatients($doctor)->findOrFail($patient);
        $data = $request->validate([
            'record_type' => ['required', Rule::in(['clinical_note', 'diagnosis', 'follow_up', 'study'])],
            'title' => ['required', 'string', 'max:180'],
            'summary' => ['required', 'string', 'max:5000'],
            'recorded_at' => ['required', 'date'],
        ]);
        $record = $model->clinicalRecords()->create([...$data, 'doctor_id' => $doctor->id, 'payload' => ['source' => 'klini_mobile']]);
        $audit->record($request, 'mobile.doctor.patient.record.created', $record, 'doctor');

        return MobileApiResponse::success(['clinical_record' => ['id' => $record->id, ...$data]], 201);
    }

    public function prescriptions(Request $request): JsonResponse
    {
        $paginator = $this->doctor($request)->prescriptions()
            ->with(['patient:id,full_name,platform_number', 'items'])
            ->latest('issued_at')
            ->paginate($this->perPage($request));

        return $this->paginated($paginator, fn (Prescription $prescription): array => $this->prescriptionData($prescription));
    }

    public function storePrescription(Request $request, PrescriptionPharmacyService $pharmacy, PlatformAuditService $audit): JsonResponse
    {
        $doctor = $this->doctor($request);
        $data = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'issued_at' => ['required', 'date'],
            'diagnosis' => ['required', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.medication_catalog_item_id' => ['nullable', 'integer', 'exists:medication_catalog_items,id'],
            'items.*.medication_name' => ['required', 'string', 'max:255'],
            'items.*.cnis' => ['nullable', 'string', 'max:100'],
            'items.*.dose' => ['nullable', 'string', 'max:120'],
            'items.*.presentation' => ['nullable', 'string', 'max:160'],
            'items.*.route' => ['nullable', 'string', 'max:100'],
            'items.*.frequency' => ['nullable', 'string', 'max:120'],
            'items.*.duration' => ['nullable', 'string', 'max:120'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'items.*.instructions' => ['nullable', 'string', 'max:1000'],
        ]);
        $this->authorizedPatients($doctor)->findOrFail($data['patient_id']);

        $prescription = DB::transaction(function () use ($doctor, $data): Prescription {
            $prescription = Prescription::query()->create([
                'patient_id' => $data['patient_id'],
                'doctor_id' => $doctor->id,
                'code' => 'RX-M-'.Str::upper(Str::random(12)),
                'status' => 'pending',
                'issued_at' => $data['issued_at'],
                'notes' => $data['notes'] ?? null,
                'metadata' => ['medical_unit_id' => $doctor->medical_unit_id, 'diagnosis' => $data['diagnosis'], 'source' => 'klini_mobile'],
            ]);
            foreach ($data['items'] as $item) {
                $prescription->items()->create([
                    'medication_catalog_item_id' => $item['medication_catalog_item_id'] ?? null,
                    'medication_name' => $item['medication_name'],
                    'dose' => $item['dose'] ?? null,
                    'frequency' => $item['frequency'] ?? null,
                    'duration' => $item['duration'] ?? null,
                    'instructions' => $item['instructions'] ?? null,
                    'metadata' => collect($item)->only(['cnis', 'presentation', 'route', 'quantity'])->all(),
                ]);
            }

            return $prescription;
        });
        $pharmacy->sync($prescription->load(['items', 'patient']));
        $audit->record($request, 'mobile.doctor.prescription.created', $prescription, 'doctor');

        return MobileApiResponse::success(['prescription' => $this->prescriptionData($prescription->fresh(['patient', 'items']))], 201);
    }

    public function requests(Request $request): JsonResponse
    {
        $doctor = $this->doctor($request);
        $paginator = ProviderRequest::query()
            ->with('patient:id,full_name,platform_number')
            ->where('payload->doctor_id', $doctor->id)
            ->latest('requested_at')
            ->paginate($this->perPage($request));

        return $this->paginated($paginator, fn (ProviderRequest $item): array => $this->requestData($item));
    }

    public function storeLabRequest(Request $request, PlatformAuditService $audit): JsonResponse
    {
        $doctor = $this->doctor($request);
        $data = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'service' => ['required', 'string', 'max:255'],
            'required_at' => ['nullable', 'date'],
            'diagnosis' => ['required', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:4000'],
            'priority' => ['nullable', Rule::in(['routine', 'urgent'])],
        ]);
        $this->authorizedPatients($doctor)->findOrFail($data['patient_id']);
        $provider = Provider::query()->where('provider_type', 'clinical_labs')->where('status', 'active')->first();

        $providerRequest = DB::transaction(function () use ($doctor, $data, $provider): ProviderRequest {
            $model = ProviderRequest::query()->create([
                'provider_id' => $provider?->id,
                'patient_id' => $data['patient_id'],
                'medical_unit_id' => $doctor->medical_unit_id,
                'external_id' => 'LAB-M-'.Str::upper(Str::random(10)),
                'request_type' => 'clinical_labs',
                'status' => 'requested',
                'requested_at' => now(),
                'required_at' => $data['required_at'] ?? null,
                'payload' => ['source' => 'klini_mobile', 'doctor_id' => $doctor->id, 'doctor' => $doctor->full_name, 'service' => $data['service'], 'diagnosis' => $data['diagnosis'], 'notes' => $data['notes'] ?? null, 'priority' => $data['priority'] ?? 'routine'],
            ]);
            ProviderRequestStatusEvent::query()->create(['provider_request_id' => $model->id, 'status' => 'requested', 'actor' => $doctor->full_name, 'occurred_at' => now(), 'metadata' => ['source' => 'klini_mobile']]);

            return $model;
        });
        $audit->record($request, 'mobile.doctor.service_request.created', $providerRequest, 'doctor');

        return MobileApiResponse::success(['request' => $this->requestData($providerRequest->load('patient'))], 201);
    }

    private function doctor(Request $request): Doctor
    {
        return $request->user()->doctor()->firstOrFail();
    }

    private function authorizedPatients(Doctor $doctor): Builder
    {
        return Patient::query()->where(function (Builder $query) use ($doctor): void {
            $query->where('primary_doctor_id', $doctor->id)
                ->orWhereHas('appointments', fn ($appointments) => $appointments->where('doctor_id', $doctor->id))
                ->orWhereHas('prescriptions', fn ($prescriptions) => $prescriptions->where('doctor_id', $doctor->id))
                ->orWhereHas('clinicalEncounters', fn ($encounters) => $encounters->where('doctor_id', $doctor->id));
        });
    }

    private function patientSummary(Patient $patient): array
    {
        return ['id' => $patient->id, 'platform_number' => $patient->platform_number, 'full_name' => $patient->full_name, 'status' => $patient->status];
    }

    private function prescriptionData(Prescription $prescription): array
    {
        return ['id' => $prescription->id, 'code' => $prescription->code, 'status' => $prescription->status, 'issued_at' => $prescription->issued_at?->toIso8601String(), 'notes' => $prescription->notes, 'patient' => $prescription->patient ? $this->patientSummary($prescription->patient) : null, 'items' => $prescription->items->map(fn ($item) => ['id' => $item->id, 'medication_name' => $item->medication_name, 'dose' => $item->dose, 'frequency' => $item->frequency, 'duration' => $item->duration, 'instructions' => $item->instructions])->values()];
    }

    private function requestData(ProviderRequest $request): array
    {
        return ['id' => $request->id, 'external_id' => $request->external_id, 'type' => $request->request_type, 'status' => $request->status, 'requested_at' => $request->requested_at?->toIso8601String(), 'required_at' => $request->required_at?->toIso8601String(), 'service' => data_get($request->payload, 'service'), 'priority' => data_get($request->payload, 'priority'), 'patient' => $request->patient ? $this->patientSummary($request->patient) : null];
    }

    private function perPage(Request $request): int
    {
        return min(max($request->integer('per_page', 15), 1), 50);
    }

    private function paginated(LengthAwarePaginator $paginator, callable $transform): JsonResponse
    {
        return MobileApiResponse::success(['items' => $paginator->getCollection()->map($transform)->values()], meta: ['pagination' => ['current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage(), 'per_page' => $paginator->perPage(), 'total' => $paginator->total()]]);
    }
}
