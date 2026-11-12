<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\Appointment;
use App\Models\AppointmentStatusEvent;
use App\Models\ClinicalEncounter;
use App\Models\ClinicalRecord;
use App\Models\DoctorAvailabilityRule;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\MedicationCatalogItem;
use App\Models\MixtureIntegration;
use App\Models\Prescription;
use App\Models\Provider;
use App\Models\ProviderRequest;
use App\Models\ProviderRequestStatusEvent;
use App\Services\DoctorAvailabilityService;
use App\Services\AppointmentSchedulingService;
use App\Services\Platform\DomainStateTransitionService;
use App\Services\Platform\PlatformAuditService;
use App\Services\PrescriptionPharmacyService;
use App\Services\Integrations\Cbta\CbtaCatalogClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class DoctorPortalController extends Controller
{
    public function index(Request $request): View
    {
        $doctor = $this->resolveDoctor($request);

        if ($request->boolean('reset_video_schedule')) {
            $request->session()->forget('video_schedule_confirmation');
        }

        $doctor->load([
            'user',
            'medicalUnit.institution',
            'medicalUnit.contractedServices.service',
            'appointments.patient',
            'appointments.medicalUnit',
            'prescriptions.patient',
            'prescriptions.items',
            'clinicalRecords.patient',
            'clinics.medicalUnit',
            'clinics.availabilityRules',
            'availabilityRules.clinic',
            'clinicalEncounters.patient',
            'clinicalEncounters.appointment',
        ]);

        $institutionalAppointments = $doctor->status === 'active' && $doctor->medical_unit_id && filled($doctor->specialty)
            ? Appointment::query()
                ->with(['patient', 'procedureArea'])
                ->where('medical_unit_id', $doctor->medical_unit_id)
                ->whereNull('doctor_id')
                ->where('specialty', $doctor->specialty)
                ->where('metadata->source', 'unit_consultation_calendar')
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->where('starts_at', '>', now())
                ->orderBy('starts_at')
                ->get()
            : collect();
        $assignedInstitutionalAppointments = $doctor->medical_unit_id
            ? Appointment::query()
                ->with(['patient', 'procedureArea'])
                ->where('medical_unit_id', $doctor->medical_unit_id)
                ->where('doctor_id', $doctor->id)
                ->where('metadata->source', 'unit_consultation_calendar')
                ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
                ->where('starts_at', '>', now())
                ->orderBy('starts_at')
                ->get()
            : collect();

        $patients = Patient::query()
            ->with([
                'user',
                'appointments' => fn ($query) => $query
                    ->where('doctor_id', $doctor->id)
                    ->with('medicalUnit')
                    ->latest('starts_at'),
                'prescriptions' => fn ($query) => $query
                    ->where('doctor_id', $doctor->id)
                    ->latest('issued_at'),
            ])
            ->withCount([
                'clinicalEncounters as doctor_encounters_count' => fn ($query) => $query->where('doctor_id', $doctor->id),
            ])
            ->where(function ($query) use ($doctor): void {
                $query->whereHas('appointments', fn ($appointments) => $appointments->where('doctor_id', $doctor->id))
                    ->orWhereHas('prescriptions', fn ($prescriptions) => $prescriptions->where('doctor_id', $doctor->id))
                    ->orWhereHas('clinicalEncounters', fn ($encounters) => $encounters->where('doctor_id', $doctor->id))
                    ->orWhere('primary_doctor_id', $doctor->id);
            })
            ->orderBy('full_name')
            ->get();

        $selectedPatient = $request->filled('patient')
            ? $patients->firstWhere('id', (int) $request->integer('patient'))
            : null;
        $selectedPatient?->load([
            'appointments' => fn ($query) => $query->where('doctor_id', $doctor->id)->latest('starts_at'),
            'prescriptions' => fn ($query) => $query->where('doctor_id', $doctor->id)->with('items')->latest('issued_at'),
            'clinicalRecords' => fn ($query) => $query->where('doctor_id', $doctor->id)->latest('recorded_at'),
            'clinicalEncounters' => fn ($query) => $query->where('doctor_id', $doctor->id)->latest('started_at'),
            'diagnoses',
            'treatments',
        ]);

        $selectedClinic = $request->filled('edit_clinic')
            ? $doctor->clinics->firstWhere('id', (int) $request->integer('edit_clinic'))
            : null;

        $providerRequests = ProviderRequest::query()
            ->with([
                'patient',
                'provider',
                'medicalUnit',
                'mixtureIntegration',
                'statusEvents' => fn ($query) => $query
                    ->where('actor', 'cbta.integration')
                    ->whereIn('status', ['ready', 'delivered', 'cancelled', 'rejected'])
                    ->latest('occurred_at'),
            ])
            ->when($doctor->medical_unit_id, fn ($query) => $query->where('medical_unit_id', $doctor->medical_unit_id))
            ->where('payload->doctor_id', $doctor->id)
            ->latest('requested_at')
            ->limit(20)
            ->get();
        $mixtureNotifications = $providerRequests
            ->flatMap(fn (ProviderRequest $providerRequest) => $providerRequest->statusEvents->map(fn ($event) => (object) [
                'request' => $providerRequest,
                'event' => $event,
            ]))
            ->sortByDesc(fn ($notification) => $notification->event->occurred_at)
            ->unique(fn ($notification) => $notification->request->id.'|'.$notification->event->status)
            ->take(5)
            ->values();

        $providerRequests->each(function (ProviderRequest $providerRequest): void {
            $documents = data_get($providerRequest->mixtureIntegration?->metadata, 'remote_documents', []);
            if (is_array($documents) && $documents !== []) {
                $payload = $providerRequest->payload ?? [];
                data_set($payload, 'cbta.documents', $documents);
                $providerRequest->setAttribute('payload', $payload);
            }
        });

        $operationalServices = $this->operationalServices($doctor);
        $availableRequestTypes = $operationalServices
            ->pluck('request_type')
            ->filter()
            ->unique()
            ->values();

        $cbtaCatalogs = ['npt' => collect(), 'oncology' => collect()];
        $cbtaCatalogVersions = ['npt' => null, 'oncology' => null];
        $cbtaCatalogOptions = ['oncology_infusors' => collect()];
        $cbtaCatalogError = null;
        if ($doctor->medicalUnit?->cbta_external_code) {
            try {
                $client = app(CbtaCatalogClient::class);
                $unitCode = $doctor->medicalUnit->cbta_external_code;
                $nptCatalog = Cache::remember(
                    "cbta.catalog.{$unitCode}.npt",
                    now()->addMinutes(5),
                    fn () => $client->nptCatalog($unitCode)
                );
                $oncologyCatalog = Cache::remember(
                    "cbta.catalog.{$unitCode}.oncology",
                    now()->addMinutes(5),
                    fn () => $client->oncologyCatalog($unitCode)
                );
                $cbtaCatalogs['npt'] = collect($nptCatalog['items'] ?? []);
                $cbtaCatalogs['oncology'] = collect($oncologyCatalog['items'] ?? []);
                $cbtaCatalogVersions['npt'] = $nptCatalog['catalog_version'] ?? null;
                $cbtaCatalogVersions['oncology'] = $oncologyCatalog['catalog_version'] ?? null;
                $cbtaCatalogOptions['oncology_infusors'] = collect($oncologyCatalog['infusors'] ?? []);
            } catch (Throwable) {
                $cbtaCatalogError = 'No fue posible consultar el catalogo operativo de Mezclas. Intenta nuevamente.';
            }
        }

        $videoScheduleConfirmation = $request->session()->get('video_schedule_confirmation');
        $scheduledAppointmentId = $request->integer('appointment') ?: (int) data_get($videoScheduleConfirmation, 'appointment_id');
        $scheduledVideoAppointment = null;

        if (($request->boolean('scheduled') || $videoScheduleConfirmation) && $scheduledAppointmentId) {
            $scheduledVideoAppointment = Appointment::query()
                ->with('patient')
                ->where('doctor_id', $doctor->id)
                ->find($scheduledAppointmentId);
        }

        // La confirmación se conserva durante la redirección inmediata aunque la
        // relación de citas aún no haya sido recargada por completo.
        if (($request->boolean('scheduled') || $videoScheduleConfirmation) && ! $scheduledVideoAppointment && $videoScheduleConfirmation) {
            $scheduledVideoAppointment = (object) [
                'patient' => (object) [
                    'full_name' => data_get($videoScheduleConfirmation, 'patient_name'),
                    'platform_number' => data_get($videoScheduleConfirmation, 'patient_number'),
                ],
                'starts_at' => Carbon::parse(data_get($videoScheduleConfirmation, 'starts_at')),
                'duration' => data_get($videoScheduleConfirmation, 'duration', 20),
                'reason' => data_get($videoScheduleConfirmation, 'reason'),
            ];
        }

        // Algunas capas de compatibilidad normalizan la URL tras un POST. La
        // confirmación en sesión mantiene visible el paso 4 aun sin parámetros.
        $videoScheduleComplete = ($request->boolean('scheduled') || (bool) $videoScheduleConfirmation)
            && ($scheduledAppointmentId > 0 || $request->boolean('scheduled_confirmation') || (bool) $videoScheduleConfirmation);

        return view('doctor.dashboard', [
            'doctor' => $doctor,
            'appointments' => $doctor->appointments
                ->sortBy('starts_at')
                ->take(8),
            'institutionalAppointments' => $institutionalAppointments,
            'assignedInstitutionalAppointments' => $assignedInstitutionalAppointments,
            'patients' => $patients,
            'selectedPatient' => $selectedPatient,
            'prescriptions' => $doctor->prescriptions
                ->sortByDesc('issued_at')
                ->take(8),
            'clinicalRecords' => $doctor->clinicalRecords
                ->sortByDesc('recorded_at')
                ->take(8),
            'services' => $operationalServices,
            'availableRequestTypes' => $availableRequestTypes,
            'providerRequests' => $providerRequests,
            'mixtureNotifications' => $mixtureNotifications,
            'clinics' => $doctor->clinics->sortBy('name')->values(),
            'selectedClinic' => $selectedClinic,
            'availabilityRules' => $doctor->availabilityRules->sortBy(fn ($rule) => sprintf('%d-%s', $rule->weekday, $rule->start_time))->values(),
            'encounters' => $doctor->clinicalEncounters->sortByDesc('started_at')->take(8),
            'medications' => MedicationCatalogItem::query()->where('status', 'active')->orderBy('generic_name')->limit(500)->get(),
            'scheduledVideoAppointment' => $scheduledVideoAppointment,
            'videoScheduleComplete' => $videoScheduleComplete,
            'cbtaCatalogs' => $cbtaCatalogs,
            'cbtaCatalogVersions' => $cbtaCatalogVersions,
            'cbtaCatalogOptions' => $cbtaCatalogOptions,
            'cbtaCatalogError' => $cbtaCatalogError,
        ]);
    }

    /**
     * Homologa las asignaciones operativas del médico con el módulo actual.
     */
    private function operationalServices(Doctor $doctor): \Illuminate\Support\Collection
    {
        $metadata = $doctor->metadata ?? [];
        $assignments = collect($metadata['service_assignments'] ?? []);

        if (! $doctor->medical_unit_id && $assignments->isEmpty()) {
            $assignments = collect([
                [
                    'context' => 'private',
                    'institution' => 'Privada',
                    'name' => 'Nutrición parenteral',
                    'category' => 'Nutrición',
                    'specialty' => 'Nutrición clínica',
                    'request_type' => 'npt',
                    'status' => 'active',
                ],
                [
                    'context' => 'private',
                    'institution' => 'Privada',
                    'name' => 'Análisis Clínicos',
                    'category' => 'Diagnóstico',
                    'specialty' => 'Laboratorio clínico',
                    'request_type' => 'clinical_labs',
                    'status' => 'active',
                ],
            ]);

            $metadata['service_assignments'] = $assignments->all();
            $doctor->forceFill(['metadata' => $metadata])->save();
        }

        $assigned = $assignments
            ->filter(fn (array $assignment) => ($assignment['status'] ?? 'active') === 'active')
            ->map(fn (array $assignment) => [
                'name' => $assignment['name'] ?? 'Servicio',
                'category' => $assignment['category'] ?? 'Servicio médico',
                'specialty' => $assignment['specialty'] ?? 'Atención clínica',
                'request_type' => $assignment['request_type'] ?? null,
                'starts_at' => null,
                'ends_at' => null,
                'status' => $assignment['status'] ?? 'active',
                'context' => $assignment['institution'] ?? 'Privada',
            ]);

        $contracted = ($doctor->medicalUnit?->contractedServices ?? collect())
            ->filter(fn ($contract) => $contract->status === 'active')
            ->map(function ($contract): array {
                $name = $contract->service?->name ?? 'Servicio';
                $normalized = str($name)->lower()->ascii()->toString();

                return [
                    'name' => $name,
                    'category' => $contract->service?->category ?? 'Servicio médico',
                    'specialty' => $contract->service?->specialty ?? 'Atención clínica',
                    'request_type' => str_contains($normalized, 'nutric') ? 'npt'
                        : (str_contains($normalized, 'oncolog') || str_contains($normalized, 'quimio') ? 'chemo'
                            : (str_contains($normalized, 'analisis') || str_contains($normalized, 'laborator') ? 'clinical_labs' : null)),
                    'starts_at' => $contract->starts_at,
                    'ends_at' => $contract->ends_at,
                    'status' => $contract->status,
                    'context' => $contract->medicalUnit?->name ?? 'Unidad',
                ];
            });

        return $assigned
            ->concat($contracted)
            ->unique(fn (array $service) => mb_strtolower($service['name']))
            ->sortBy('name')
            ->values();
    }

    public function storePatient(Request $request, PlatformAuditService $audit): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        $data = $this->validatePatient($request);
        $context = $request->validate([
            'patient_location' => ['nullable', 'string', 'max:100'],
            'family_conditions' => ['nullable', 'string', 'max:1000'],
        ]);
        $location = $context['patient_location'] ?? 'private';
        $metadata = [
            'patient_location' => $location,
            'family_conditions' => $context['family_conditions'] ?? null,
        ];
        if (str_starts_with($location, 'clinic:')) {
            $clinicId = (int) substr($location, strlen('clinic:'));
            $clinic = $doctor->clinics()->whereKey($clinicId)->firstOrFail();
            $metadata['doctor_clinic_id'] = $clinic->id;
            $metadata['doctor_clinic_name'] = $clinic->name;
        }
        $data['full_name'] = trim($data['first_name'].' '.$data['last_name']);
        $data['metadata'] = array_filter($metadata, static fn ($value) => $value !== null && $value !== '');
        $data['primary_doctor_id'] = $doctor->id;
        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;
        $data['enrolled_at'] = now()->toDateString();
        $data['platform_number'] ??= 'PAC-'.str_pad((string) ((Patient::query()->max('id') ?? 0) + 1), 6, '0', STR_PAD_LEFT);
        $patient = Patient::query()->create($data);
        $audit->record($request, 'doctor.patient.created', $patient, 'doctor');

        return redirect()->route('doctor.dashboard', ['section' => 'patients', 'patient' => $patient->id])
            ->with('status', 'Paciente agregado al catálogo médico.');
    }

    public function updatePatient(Request $request, Patient $patient, PlatformAuditService $audit): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        abort_unless($this->patientBelongsToDoctor($doctor, $patient->id), 404);
        $data = $this->validatePatient($request, $patient);
        $context = $request->validate([
            'patient_location' => ['nullable', 'string', 'max:100'],
            'family_conditions' => ['nullable', 'string', 'max:1000'],
        ]);
        $metadata = $patient->metadata ?? [];
        $metadata['patient_location'] = $context['patient_location'] ?? ($metadata['patient_location'] ?? 'private');
        $metadata['family_conditions'] = $context['family_conditions'] ?? ($metadata['family_conditions'] ?? null);
        if (str_starts_with($metadata['patient_location'], 'clinic:')) {
            $clinic = $doctor->clinics()->whereKey((int) substr($metadata['patient_location'], strlen('clinic:')))->firstOrFail();
            $metadata['doctor_clinic_id'] = $clinic->id;
            $metadata['doctor_clinic_name'] = $clinic->name;
        } else {
            unset($metadata['doctor_clinic_id'], $metadata['doctor_clinic_name']);
        }
        $data['full_name'] = trim($data['first_name'].' '.$data['last_name']);
        $data['updated_by'] = $request->user()?->id;
        $data['metadata'] = array_filter($metadata, static fn ($value) => $value !== null && $value !== '');
        $patient->update($data);
        $audit->record($request, 'doctor.patient.updated', $patient, 'doctor');

        return redirect()->route('doctor.dashboard', ['section' => 'patients', 'patient' => $patient->id])
            ->with('status', 'Datos del paciente actualizados.');
    }

    public function storePatientRecord(Request $request, Patient $patient, PlatformAuditService $audit): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        abort_unless($this->patientBelongsToDoctor($doctor, $patient->id), 404);
        $data = $request->validate([
            'record_type' => ['required', Rule::in(['clinical_note', 'diagnosis', 'follow_up', 'study'])],
            'title' => ['required', 'string', 'max:180'],
            'summary' => ['required', 'string', 'max:5000'],
            'recorded_at' => ['required', 'date'],
        ]);
        $record = $patient->clinicalRecords()->create([
            ...$data,
            'doctor_id' => $doctor->id,
            'payload' => ['source' => 'doctor_patient_record'],
        ]);
        $audit->record($request, 'doctor.patient.record.created', $record, 'doctor');

        return redirect()->route('doctor.dashboard', ['section' => 'patients', 'patient' => $patient->id])
            ->with('status', 'Nota agregada al expediente.');
    }

    public function storeClinic(Request $request): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:500'],
            'location_type' => ['required', Rule::in(['in_person', 'virtual', 'hybrid'])],
            'metadata' => ['nullable', 'array'],
            'metadata.*' => ['nullable', 'string', 'max:255'],
        ]);
        $doctor->clinics()->create([...$data, 'medical_unit_id' => $doctor->medical_unit_id, 'status' => 'active']);
        return redirect()->route('doctor.dashboard', ['section' => 'clinics'])->with('status', 'Consultorio guardado.');
    }

    public function updateClinic(Request $request, DoctorClinic $clinic): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        abort_unless($clinic->doctor_id === $doctor->id, 404);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:500'],
            'location_type' => ['required', Rule::in(['in_person', 'virtual', 'hybrid'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'metadata' => ['nullable', 'array'],
            'metadata.*' => ['nullable', 'string', 'max:255'],
        ]);
        $clinic->update($data);

        return redirect()->route('doctor.dashboard', ['section' => 'clinics'])->with('status', 'Consultorio actualizado.');
    }

    public function destroyClinic(Request $request, DoctorClinic $clinic): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        abort_unless($clinic->doctor_id === $doctor->id, 404);

        if ($clinic->availabilityRules()->exists()) {
            $clinic->update(['status' => 'inactive']);

            return redirect()->route('doctor.dashboard', ['section' => 'clinics'])->with('status', 'El consultorio tiene horarios asociados y fue inactivado.');
        }

        $clinic->delete();

        return redirect()->route('doctor.dashboard', ['section' => 'clinics'])->with('status', 'Consultorio eliminado.');
    }

    public function storeAppointment(Request $request, AppointmentSchedulingService $scheduling, PlatformAuditService $audit): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_clinic_id' => ['nullable', 'exists:doctor_clinics,id'],
            'starts_at' => ['required', 'date'],
            'duration' => ['required', 'integer', Rule::in([20, 30, 45, 60])],
            'modality' => ['required', Rule::in(['Presencial', 'Video llamada'])],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);
        $clinic = $doctor->clinics()
            ->whereKey($data['doctor_clinic_id'] ?? null)
            ->where('status', 'active')
            ->first();

        if (! $clinic && $data['modality'] === 'Video llamada') {
            $clinic = $doctor->clinics()->firstOrCreate(
                ['name' => 'Consultorio virtual'],
                [
                    'medical_unit_id' => $doctor->medical_unit_id,
                    'location_type' => 'virtual',
                    'status' => 'active',
                    'address' => 'Atención por videollamada',
                ],
            );
        }

        if (! $clinic) {
            throw ValidationException::withMessages([
                'doctor_clinic_id' => 'Selecciona un consultorio para la cita presencial.',
            ]);
        }
        $startsAt = Carbon::parse($data['starts_at']);
        $endsAt = $startsAt->copy()->addMinutes((int) $data['duration']);
        $scheduling->assertAvailable($doctor, $startsAt, $endsAt);

        $appointment = Appointment::query()->create([
            'patient_id' => $data['patient_id'],
            'doctor_id' => $doctor->id,
            'medical_unit_id' => $clinic->medical_unit_id ?? $doctor->medical_unit_id,
            'specialty' => $doctor->specialty,
            'modality' => $data['modality'],
            'location' => $clinic->name,
            'status' => 'scheduled',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'reason' => $data['reason'] ?? null,
            'metadata' => ['source' => 'doctor_module', 'doctor_clinic_id' => $clinic->id],
        ]);
        $audit->record($request, 'doctor.appointment.created', $appointment, 'doctor');

        if ($data['modality'] === 'Video llamada') {
            $request->session()->put('video_schedule_confirmation', [
                'appointment_id' => $appointment->id,
                'patient_name' => $appointment->patient->full_name,
                'patient_number' => $appointment->patient->platform_number,
                'starts_at' => $appointment->starts_at?->toIso8601String(),
                'duration' => $data['duration'],
                'reason' => $data['reason'] ?? null,
            ]);

            return redirect()->route('doctor.dashboard', [
                'section' => 'video',
                'action' => 'schedule',
                'scheduled' => 1,
                'scheduled_confirmation' => 1,
                'appointment' => $appointment->id,
            ])->with('status', 'Videoconsulta agendada.');
        }

        return redirect()->route('doctor.dashboard', ['section' => 'agenda'])->with('status', 'Cita agregada a la agenda.');
    }

    public function claimInstitutionalAppointment(
        Request $request,
        Appointment $appointment,
        AppointmentSchedulingService $scheduling,
        PlatformAuditService $audit,
    ): RedirectResponse {
        $doctor = $this->resolveDoctor($request);
        abort_unless($doctor->status === 'active' && $doctor->medical_unit_id && filled($doctor->specialty), 403);

        $claimedAppointment = DB::transaction(function () use ($appointment, $doctor, $scheduling): Appointment {
            $doctor = Doctor::query()->whereKey($doctor->id)->lockForUpdate()->firstOrFail();
            $appointment = Appointment::query()->whereKey($appointment->id)->lockForUpdate()->firstOrFail();
            abort_unless(
                $doctor->status === 'active'
                && (int) $appointment->medical_unit_id === (int) $doctor->medical_unit_id
                && mb_strtolower(trim((string) $appointment->specialty)) === mb_strtolower(trim((string) $doctor->specialty))
                && data_get($appointment->metadata, 'source') === 'unit_consultation_calendar',
                404,
            );

            if ($appointment->doctor_id || ! in_array($appointment->status, ['scheduled', 'confirmed'], true) || ! $appointment->starts_at?->isFuture()) {
                throw ValidationException::withMessages(['appointment' => 'Esta cita ya no esta disponible para tomar.']);
            }

            $scheduling->assertInstitutionalConsultationAvailable(
                $doctor,
                $appointment->starts_at,
                $appointment->ends_at ?: $appointment->starts_at->copy()->addMinutes(30),
                null,
                $appointment->id,
            );

            $metadata = $appointment->metadata ?? [];
            $metadata['claimed_at'] = now()->toIso8601String();
            $appointment->update(['doctor_id' => $doctor->id, 'metadata' => $metadata]);

            return $appointment;
        });

        $audit->record($request, 'doctor.institutional_appointment.claimed', $claimedAppointment, 'doctor', [
            'unit_id' => $doctor->medical_unit_id,
        ]);

        return redirect()->route('doctor.dashboard', ['section' => 'agenda'])
            ->with('status', 'Cita de la unidad agregada a tu agenda.');
    }

    public function updateAppointmentStatus(
        Request $request,
        Appointment $appointment,
        DomainStateTransitionService $transitions,
        PlatformAuditService $audit
    ): RedirectResponse {
        $doctor = $this->resolveDoctor($request);
        abort_unless($appointment->doctor_id === $doctor->id, 404);
        $data = $request->validate(['status' => ['required', Rule::in(['scheduled', 'in_progress', 'completed', 'cancelled'])]]);
        $previous = $appointment->status;
        $transitions->assertAllowed('appointment', $previous, $data['status']);

        DB::transaction(fn () => $this->transitionAppointment($appointment, $data['status'], $request, 'doctor.appointment.updated'));
        $audit->record($request, 'doctor.appointment.updated', $appointment, 'doctor', ['from' => $previous, 'to' => $data['status']]);

        return redirect()->route('doctor.dashboard', ['section' => 'agenda'])->with('status', 'Estado de la cita actualizado.');
    }

    public function storeAvailability(Request $request, DoctorAvailabilityService $service): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        $data = $request->validate([
            'doctor_clinic_id' => ['required', 'integer'], 'weekday' => ['required', 'integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i'], 'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'recurrence_start' => ['required', 'date'], 'recurrence_end' => ['nullable', 'date', 'after_or_equal:recurrence_start'],
            'mode' => ['required', Rule::in(['in_person', 'virtual', 'hybrid'])],
            'period_mode' => ['nullable', Rule::in(['all', 'year', 'month', 'range'])],
            'period_year' => ['nullable', 'integer', 'between:1900,2100'],
            'period_month' => ['nullable', 'integer', 'between:1,12'],
            'period_start' => ['nullable', 'date_format:Y-m'],
            'period_end' => ['nullable', 'date_format:Y-m'],
        ]);
        $service->createRule($doctor, $this->prepareAvailabilityPeriod($data));
        return back()->with('status', 'Horario publicado.');
    }

    /** Convierte el alcance de Legacy a fechas y meses que Laravel puede consultar. */
    private function prepareAvailabilityPeriod(array $data): array
    {
        $mode = $data['period_mode'] ?? 'all';
        $now = now();
        $start = Carbon::parse($data['recurrence_start']);
        $end = filled($data['recurrence_end'] ?? null) ? Carbon::parse($data['recurrence_end']) : null;
        $months = range(1, 12);

        if ($mode === 'year') {
            $year = (int) ($data['period_year'] ?? $now->year);
            $start = Carbon::create($year, 1, 1);
            $end = Carbon::create($year, 12, 31);
        }
        if ($mode === 'month') {
            $year = (int) ($data['period_year'] ?? $now->year);
            $month = (int) ($data['period_month'] ?? $now->month);
            $start = Carbon::create($year, $month, 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $months = [$month];
        }
        if ($mode === 'range') {
            $first = Carbon::createFromFormat('Y-m', $data['period_start'] ?? $now->format('Y-m'))->startOfMonth();
            $last = Carbon::createFromFormat('Y-m', $data['period_end'] ?? $first->format('Y-m'))->endOfMonth();
            if ($last->lt($first)) [$first, $last] = [$last->copy()->startOfMonth(), $first->copy()->endOfMonth()];
            $start = $first;
            $end = $last;
            $months = $first->year === $last->year ? range($first->month, $last->month) : range(1, 12);
        }

        return [
            ...$data,
            'recurrence_start' => $start->toDateString(),
            'recurrence_end' => $end?->toDateString(),
            'selected_months' => $months,
            'metadata' => ['period_mode' => $mode],
        ];
    }

    public function destroyAvailability(Request $request, DoctorAvailabilityRule $availability): RedirectResponse
    {
        abort_unless($availability->doctor_id === $this->resolveDoctor($request)->id, 404);
        $availability->delete();
        return back()->with('status', 'Horario eliminado.');
    }

    public function storeEncounter(Request $request): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'], 'appointment_id' => ['nullable', 'exists:appointments,id'],
            'reason' => ['nullable', 'string'], 'symptoms' => ['nullable', 'string'], 'assessment' => ['nullable', 'string'],
            'treatment_plan' => ['nullable', 'string'], 'notes' => ['nullable', 'string'],
            'examination' => ['nullable', 'string'], 'vital_signs' => ['nullable', 'array'], 'background' => ['nullable', 'array'],
            'modality' => ['nullable', Rule::in(['Presencial', 'Video llamada'])],
        ]);
        abort_unless($this->patientBelongsToDoctor($doctor, (int) $data['patient_id']), 404);
        $appointment = null;
        if (! empty($data['appointment_id'])) {
            $appointment = $doctor->appointments()->whereKey($data['appointment_id'])->firstOrFail();
            abort_unless((int) $appointment->patient_id === (int) $data['patient_id'], 422);
        }

        DB::transaction(function () use ($doctor, $data, $appointment, $request): void {
            $encounterData = [
                ...collect($data)->except(['appointment_id', 'modality'])->all(),
                'appointment_id' => $appointment?->id,
                'medical_unit_id' => $doctor->medical_unit_id,
                'procedure_area_id' => $appointment?->procedure_area_id,
                'status' => 'in_progress',
                'started_at' => now(),
                'metadata' => ['source' => 'doctor_module', 'modality' => $appointment?->modality ?? ($data['modality'] ?? 'Presencial')],
            ];

            if ($appointment) {
                $doctor->clinicalEncounters()->firstOrCreate(
                    ['appointment_id' => $appointment->id],
                    $encounterData
                );
            } else {
                $doctor->clinicalEncounters()->create($encounterData);
            }

            if ($appointment && $appointment->status === 'scheduled') {
                $this->transitionAppointment($appointment, 'in_progress', $request, 'doctor.encounter.started');
            }
        });

        return redirect()->route('doctor.dashboard', ['section' => 'consultation'])->with('status', 'Consulta clínica iniciada.');
    }

    public function updateEncounter(Request $request, ClinicalEncounter $encounter, PlatformAuditService $audit): RedirectResponse
    {
        abort_unless($encounter->doctor_id === $this->resolveDoctor($request)->id, 404);
        abort_if($encounter->status === 'completed', 422);
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'], 'symptoms' => ['nullable', 'string', 'max:5000'],
            'vital_signs' => ['nullable', 'array'], 'background' => ['nullable', 'array'],
            'examination' => ['nullable', 'string', 'max:5000'], 'assessment' => ['nullable', 'string', 'max:5000'],
            'treatment_plan' => ['nullable', 'string', 'max:5000'], 'notes' => ['nullable', 'string', 'max:5000'],
        ]);
        $encounter->update($data);
        $audit->record($request, 'doctor.encounter.updated', $encounter, 'doctor');

        return redirect()->route('doctor.dashboard', ['section' => 'consultation'])->with('status', 'Avance de consulta guardado.');
    }

    public function completeEncounter(Request $request, ClinicalEncounter $encounter, PlatformAuditService $audit): RedirectResponse
    {
        abort_unless($encounter->doctor_id === $this->resolveDoctor($request)->id, 404);
        $data = $request->validate([
            'reason' => ['nullable', 'string'], 'symptoms' => ['nullable', 'string'],
            'vital_signs' => ['nullable', 'array'], 'background' => ['nullable', 'array'],
            'examination' => ['nullable', 'string'], 'assessment' => ['required', 'string'],
            'treatment_plan' => ['nullable', 'string'], 'notes' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($encounter, $data, $request): void {
            $encounter->update([...$data, 'status' => 'completed', 'completed_at' => now()]);

            ClinicalRecord::query()->updateOrCreate(
                [
                    'patient_id' => $encounter->patient_id,
                    'doctor_id' => $encounter->doctor_id,
                    'record_type' => 'clinical_encounter',
                    'title' => 'Consulta '.$encounter->started_at?->format('d/m/Y H:i'),
                ],
                [
                    'summary' => $data['assessment'],
                    'payload' => [
                        'clinical_encounter_id' => $encounter->id,
                        'appointment_id' => $encounter->appointment_id,
                        'reason' => $encounter->reason,
                        'symptoms' => $encounter->symptoms,
                        'vital_signs' => $encounter->vital_signs,
                        'background' => $encounter->background,
                        'examination' => $encounter->examination,
                        'assessment' => $data['assessment'],
                        'treatment_plan' => $data['treatment_plan'] ?? null,
                        'notes' => $data['notes'] ?? null,
                    ],
                    'recorded_at' => now(),
                ]
            );

            if ($encounter->appointment && in_array($encounter->appointment->status, ['scheduled', 'in_progress'], true)) {
                $this->transitionAppointment($encounter->appointment, 'completed', $request, 'doctor.encounter.completed');
            }
        });

        $audit->record($request, 'doctor.encounter.completed', $encounter, 'doctor');

        return redirect()->route('doctor.dashboard', ['section' => 'consultation'])->with('status', 'Consulta clínica completada.');
    }

    public function storePrescription(Request $request, PrescriptionPharmacyService $pharmacy, PlatformAuditService $audit): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'clinical_encounter_id' => ['nullable', 'exists:clinical_encounters,id'],
            'issued_at' => ['required', 'date'],
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
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'items.*.instructions' => ['nullable', 'string', 'max:1000'],
        ]);

        abort_unless($this->patientBelongsToDoctor($doctor, (int) $data['patient_id']), 404);
        if (! empty($data['clinical_encounter_id'])) {
            ClinicalEncounter::query()
                ->whereKey($data['clinical_encounter_id'])
                ->where('doctor_id', $doctor->id)
                ->where('patient_id', $data['patient_id'])
                ->firstOrFail();
        }

        $prescription = DB::transaction(function () use ($doctor, $data): Prescription {
            $prescription = Prescription::query()->create([
                'patient_id' => $data['patient_id'],
                'doctor_id' => $doctor->id,
                'code' => 'RX-'.now()->format('YmdHis').'-'.random_int(10, 99),
                'status' => 'pending',
                'issued_at' => $data['issued_at'],
                'notes' => $data['notes'] ?? null,
                'metadata' => [
                    'medical_unit_id' => $doctor->medical_unit_id,
                    'clinical_encounter_id' => $data['clinical_encounter_id'] ?? null,
                    'diagnosis' => $data['diagnosis'],
                    'source' => 'doctor_module',
                ],
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

        $pharmacy->sync($prescription->load('items'));
        $audit->record($request, 'doctor.prescription.created', $prescription, 'doctor');

        return redirect()->route('doctor.dashboard', ['section' => 'prescriptions'])->with('status', 'Receta emitida y enviada a farmacia externa.');
    }

    public function updatePrescription(Request $request, Prescription $prescription, PrescriptionPharmacyService $pharmacy, PlatformAuditService $audit): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        abort_unless($prescription->doctor_id === $doctor->id, 404);
        abort_if($prescription->status === 'filled', 422, 'Una receta surtida ya no puede modificarse.');

        $data = $request->validate([
            'issued_at' => ['required', 'date'],
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
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'items.*.instructions' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($prescription, $data): void {
            $metadata = $prescription->metadata ?? [];
            $metadata['diagnosis'] = $data['diagnosis'];
            $metadata['updated_from'] = 'doctor_module';
            $prescription->update([
                'issued_at' => $data['issued_at'],
                'notes' => $data['notes'] ?? null,
                'metadata' => $metadata,
            ]);
            $prescription->items()->delete();
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
        });

        $pharmacy->sync($prescription->fresh('items'));
        $audit->record($request, 'doctor.prescription.updated', $prescription, 'doctor');

        return redirect()->route('doctor.dashboard', ['section' => 'prescriptions'])->with('status', 'Receta actualizada y sincronizada con Farmacia Externa.');
    }

    public function storeServiceRequest(Request $request, PlatformAuditService $audit, CbtaCatalogClient $cbta): RedirectResponse
    {
        $doctor = $this->resolveDoctor($request);
        $data = $request->validate([
            'request_type' => ['required', Rule::in(['clinical_labs', 'npt', 'chemo'])],
            'patient_id' => ['required', 'exists:patients,id'],
            'service' => ['required', 'string', 'max:255'],
            'required_at' => ['nullable', 'date'],
            'diagnosis' => [Rule::requiredIf($request->input('request_type') !== 'npt'), 'nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:4000'],
            'medication' => ['nullable', 'string', 'max:255'],
            'dose' => ['nullable', 'string', 'max:120'],
            'volume' => ['nullable', 'string', 'max:120'],
            'priority' => ['nullable', Rule::in(['routine', 'urgent'])],
            'authorization_file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'oncology' => ['nullable', 'array'],
            'oncology.request_date' => ['nullable', 'date'],
            'oncology.facility' => ['nullable', 'string', 'max:255'],
            'oncology.floor' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', 'string', 'max:50'],
            'oncology.bed' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', 'string', 'max:50'],
            'oncology.patient_identifier' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', 'string', 'max:255'],
            'oncology.sex' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', Rule::in(['Femenino', 'Masculino'])],
            'oncology.age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'oncology.weight' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', 'numeric', 'min:1', 'max:500'],
            'oncology.height' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', 'numeric', 'min:1', 'max:300'],
            'oncology.birth_date' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', 'date', 'after:'.now()->subYears(100)->toDateString(), 'before:today'],
            'oncology.allergies' => ['nullable', 'string', 'max:255'],
            'oncology.body_surface' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'oncology.preferred_infusion_time' => ['nullable', 'date_format:H:i'],
            'oncology.delivery_method' => ['nullable', 'string', 'max:120'],
            'oncology.doctor_name' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', 'string', 'max:255'],
            'oncology.professional_license' => [Rule::requiredIf($request->input('request_type') === 'chemo'), 'nullable', 'string', 'max:255'],
            'oncology.mixture_count' => ['nullable', 'integer', 'min:1', 'max:99'],
            'oncology.mixtures' => ['nullable', 'array', 'min:1', 'max:99'],
            'oncology.mixtures.*.medications' => ['required_with:oncology.mixtures', 'array', 'min:1', 'max:100'],
            'oncology.mixtures.*.medications.*.catalog_item' => ['required_with:oncology.mixtures', 'string', 'max:220'],
            'oncology.mixtures.*.medications.*.medication' => ['required_with:oncology.mixtures', 'string', 'max:180'],
            'oncology.mixtures.*.medications.*.dose' => ['required_with:oncology.mixtures', 'numeric', 'gt:0'],
            'oncology.mixtures.*.medications.*.diluent_id' => ['required_with:oncology.mixtures', 'integer', 'gt:0'],
            'oncology.mixtures.*.medications.*.route_id' => ['required_with:oncology.mixtures', 'integer', 'gt:0'],
            'oncology.mixtures.*.dilution_volume' => ['required_with:oncology.mixtures', 'numeric', 'gt:0'],
            'oncology.mixtures.*.infusion_minutes' => ['required_with:oncology.mixtures', 'integer', 'min:1'],
            'oncology.mixtures.*.delivery_dates' => ['required_with:oncology.mixtures', 'array', 'min:1', 'max:99'],
            'oncology.mixtures.*.delivery_dates.*' => ['required', 'date', 'after_or_equal:today'],
            'oncology.mixtures.*.set_infusion' => ['nullable', 'boolean'],
            'oncology.mixtures.*.infusor_id' => ['nullable', 'integer', 'gt:0'],
            'oncology.medications' => ['nullable', 'array', 'max:8'],
            'oncology.medications.*.catalog_item' => ['nullable', 'string', 'max:220'],
            'oncology.medications.*.medication' => ['nullable', 'string', 'max:180'],
            'oncology.medications.*.dose' => ['nullable', 'numeric', 'gt:0'],
            'oncology.medications.*.diluent_id' => ['nullable', 'integer', 'gt:0'],
            'oncology.medications.*.route_id' => ['nullable', 'integer', 'gt:0'],
            'oncology.medications.*.set_infusion' => ['nullable', 'boolean'],
            'oncology.medications.*.infusor_id' => ['nullable', 'integer', 'gt:0'],
            'oncology.medications.*.dilution_volume' => ['nullable', 'numeric', 'gt:0'],
            'oncology.medications.*.boluses_per_day' => ['nullable', 'integer', 'min:1'],
            'oncology.medications.*.infusion_minutes' => ['nullable', 'integer', 'min:1'],
            'oncology.medications.*.delivery_dates' => ['nullable', 'array', 'max:6'],
            'oncology.medications.*.delivery_dates.*' => ['nullable', 'date', 'after_or_equal:today'],
            'npt' => ['nullable', 'array'],
            'npt.clinical_service' => ['nullable', 'string', 'max:180'],
            'npt.bed' => ['nullable', 'string', 'max:80'],
            'npt.floor' => ['nullable', 'string', 'max:80'],
            'npt.registration' => ['nullable', 'string', 'max:120'],
            'npt.weight' => ['nullable', 'numeric', 'min:1', 'max:500'],
            'npt.sex' => ['nullable', Rule::in(['Femenino', 'Masculino', 'Otro'])],
            'npt.birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'npt.route' => ['nullable', Rule::in(['Central', 'Periferica'])],
            'npt.infusion_hours' => ['nullable', 'numeric', 'gt:0'],
            'npt.infusion_rate' => ['nullable', 'numeric', 'gt:0'],
            'npt.overfill' => ['nullable', 'numeric', 'min:0'],
            'npt.total_volume' => ['nullable', 'numeric', 'min:0'],
            'npt.npt_type' => ['nullable', Rule::in(['Individualizada', 'Tricamara', 'Pediatrica'])],
            'npt.infusion_set' => ['nullable', Rule::in(['Si', 'No'])],
            'npt.products' => ['nullable', 'array'],
            'npt.products.*' => ['nullable', 'numeric', 'min:0'],
            'npt.delivery_at' => ['nullable', 'date', 'after_or_equal:'.now()->addMinutes(210)->toDateTimeString()],
            'npt.destination_hospital' => ['nullable', 'string', 'max:255'],
            'npt.doctor_name' => ['nullable', 'string', 'max:180'],
            'npt.professional_license' => ['nullable', 'string', 'max:120'],
            'integration_items' => ['nullable', 'array', 'max:100'],
            'integration_catalog_version' => ['nullable', 'string', 'max:100'],
            'integration_items.*.catalog_item' => ['nullable', 'string', 'max:220'],
            'integration_items.*.product_code' => ['nullable', 'string', 'max:100'],
            'integration_items.*.presentation_code' => ['nullable', 'string', 'max:100'],
            'integration_items.*.quantity' => ['nullable', 'numeric', 'gt:0'],
            'integration_items.*.unit' => ['nullable', Rule::in(['ml', 'mg', 'unit'])],
        ]);
        abort_unless($this->patientBelongsToDoctor($doctor, (int) $data['patient_id']), 404);

        if ($data['request_type'] === 'npt'
            && filled(data_get($data, 'npt.infusion_hours'))
            && filled(data_get($data, 'npt.infusion_rate'))) {
            throw ValidationException::withMessages([
                'npt.infusion_rate' => 'Captura el tiempo o la velocidad de infusión, no ambos.',
            ]);
        }
        if ($data['request_type'] === 'npt'
            && blank(data_get($data, 'npt.infusion_hours'))
            && blank(data_get($data, 'npt.infusion_rate'))) {
            throw ValidationException::withMessages([
                'npt.infusion_hours' => 'Captura el tiempo o la velocidad de infusiÃ³n.',
            ]);
        }

        $oncologyMixtures = collect(data_get($data, 'oncology.mixtures', []));
        if ($data['request_type'] === 'chemo' && $oncologyMixtures->isNotEmpty()) {
            if ($oncologyMixtures->count() !== (int) data_get($data, 'oncology.mixture_count', 0)) {
                throw ValidationException::withMessages([
                    'oncology.mixture_count' => 'El número de mezclas no coincide con las mezclas capturadas.',
                ]);
            }

            $oncologyMedications = $oncologyMixtures->flatMap(function (array $mixture, int $mixtureIndex): array {
                $dates = collect($mixture['delivery_dates'] ?? [])->filter()->values()->all();
                if (count($dates) !== count(array_unique($dates))) {
                    throw ValidationException::withMessages([
                        "oncology.mixtures.$mixtureIndex.delivery_dates" => 'Las fechas de entrega no pueden repetirse dentro de una mezcla.',
                    ]);
                }

                return collect($mixture['medications'] ?? [])->map(function (array $medication) use ($mixture, $mixtureIndex, $dates): array {
                    return array_merge($medication, [
                        'mixture_index' => $mixtureIndex,
                        'dilution_volume' => $mixture['dilution_volume'] ?? null,
                        'infusion_minutes' => $mixture['infusion_minutes'] ?? null,
                        'delivery_dates' => $dates,
                        'set_infusion' => (bool) ($mixture['set_infusion'] ?? false),
                        'infusor_id' => $mixture['infusor_id'] ?? null,
                    ]);
                })->all();
            })->values()->all();
            $data['oncology']['medications'] = $oncologyMedications;
        } else {
            $oncologyMedications = collect(data_get($data, 'oncology.medications', []))
            ->filter(fn (array $item): bool => filled($item['medication'] ?? null))
            ->values()
            ->all();
        }
        if ($data['request_type'] === 'chemo' && $oncologyMedications === []) {
            throw ValidationException::withMessages(['oncology.medications' => 'Agrega al menos un medicamento oncológico.']);
        }
        if ($data['request_type'] === 'chemo') {
            foreach ($oncologyMedications as $index => $medication) {
                foreach (['catalog_item', 'dose', 'diluent_id', 'route_id', 'dilution_volume', 'infusion_minutes'] as $field) {
                    if (blank($medication[$field] ?? null)) {
                        throw ValidationException::withMessages([
                            "oncology.medications.$index.$field" => 'Completa todos los datos obligatorios del medicamento.',
                        ]);
                    }
                }

                $deliveryDates = collect($medication['delivery_dates'] ?? [])->filter()->values();
                if ($deliveryDates->isEmpty()) {
                    throw ValidationException::withMessages([
                        "oncology.medications.$index.delivery_dates" => 'Captura al menos una fecha de entrega.',
                    ]);
                }
                if ($deliveryDates->duplicates()->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        "oncology.medications.$index.delivery_dates" => 'Las fechas de entrega no pueden repetirse.',
                    ]);
                }
            }
        }
        if ($data['request_type'] === 'npt') {
            foreach (['weight', 'birth_date', 'route', 'npt_type', 'delivery_at', 'destination_hospital', 'doctor_name', 'professional_license'] as $field) {
                if (blank(data_get($data, "npt.$field"))) {
                    throw ValidationException::withMessages(["npt.$field" => 'Este campo es obligatorio para la solicitud de nutrición parenteral.']);
                }
            }
        }

        $integrationItems = collect($data['integration_items'] ?? [])
            ->map(function (array $item): array {
                if (filled($item['catalog_item'] ?? null)) {
                    [$productCode, $presentationCode] = array_pad(explode('|', $item['catalog_item'], 2), 2, null);
                    $item['product_code'] = $productCode;
                    $item['presentation_code'] = $presentationCode;
                }

                unset($item['catalog_item']);

                return $item;
            })
            ->filter(fn (array $item): bool => filled($item['product_code'] ?? null)
                && filled($item['presentation_code'] ?? null)
                && filled($item['quantity'] ?? null)
                && filled($item['unit'] ?? null))
            ->values()
            ->all();
        if ($data['request_type'] === 'chemo' && $oncologyMedications !== []) {
            $integrationItems = collect($oncologyMedications)->map(function (array $item): array {
                [$productCode, $presentationCode] = array_pad(explode('|', (string) $item['catalog_item'], 2), 2, null);

                return [
                    'product_code' => $productCode,
                    'presentation_code' => $presentationCode,
                    'quantity' => (float) $item['dose'],
                    'unit' => 'mg',
                ];
            })->all();
        }
        $mixtureType = $data['request_type'] === 'chemo' ? 'oncology' : ($data['request_type'] === 'npt' ? 'npt' : null);
        $unitCode = $doctor->medicalUnit?->cbta_external_code;
        $prevalidationPayload = null;
        $prevalidation = null;

        if ($mixtureType && $unitCode) {
            if ($integrationItems === []) {
                throw ValidationException::withMessages([
                    'integration_items' => 'Selecciona al menos un producto del catalogo operativo de Mezclas.',
                ]);
            }

            if ($mixtureType === 'oncology') {
                try {
                    $oncologyCatalog = $cbta->oncologyCatalog($unitCode);
                } catch (Throwable) {
                    throw ValidationException::withMessages([
                        'oncology.medications' => 'No fue posible verificar las reglas del catálogo oncológico de Mezclas.',
                    ]);
                }

                $catalogItems = collect($oncologyCatalog['items'] ?? [])->keyBy(
                    fn (array $item): string => ($item['product_code'] ?? '').'|'.($item['presentation_code'] ?? '')
                );
                $activeInfusors = collect($oncologyCatalog['infusors'] ?? [])->pluck('id')->map(fn ($id) => (int) $id);

                foreach ($oncologyMedications as $index => $medication) {
                    $catalogItem = $catalogItems->get((string) ($medication['catalog_item'] ?? ''));
                    if (! is_array($catalogItem)) {
                        throw ValidationException::withMessages([
                            "oncology.medications.$index.catalog_item" => 'El medicamento no pertenece al catálogo vigente del hospital.',
                        ]);
                    }

                    $diluentIds = collect($catalogItem['diluents'] ?? [])->pluck('id')->map(fn ($id) => (int) $id);
                    $routeIds = collect($catalogItem['administration_routes'] ?? [])->pluck('id')->map(fn ($id) => (int) $id);
                    if (! $diluentIds->contains((int) $medication['diluent_id']) || ! $routeIds->contains((int) $medication['route_id'])) {
                        throw ValidationException::withMessages([
                            "oncology.medications.$index.diluent_id" => 'Selecciona un diluyente y una vía compatibles con el medicamento.',
                        ]);
                    }

                    $concentration = (float) $medication['dose'] / (float) $medication['dilution_volume'];
                    $minimum = data_get($catalogItem, 'concentration.min');
                    $maximum = data_get($catalogItem, 'concentration.max');
                    if (($minimum !== null && $concentration < (float) $minimum)
                        || ($maximum !== null && (float) $maximum > 0 && $concentration > (float) $maximum)) {
                        throw ValidationException::withMessages([
                            "oncology.medications.$index.dose" => 'La concentración está fuera del rango permitido por CBTA.',
                        ]);
                    }

                    $infusorId = (int) ($medication['infusor_id'] ?? 0);
                    if (! empty($medication['set_infusion']) && $infusorId > 0) {
                        throw ValidationException::withMessages([
                            "oncology.medications.$index.infusor_id" => 'Selecciona set de infusión o infusor, no ambos.',
                        ]);
                    }
                    if ($infusorId > 0 && (! $activeInfusors->contains($infusorId) || empty($catalogItem['requires_infusor']))) {
                        throw ValidationException::withMessages([
                            "oncology.medications.$index.infusor_id" => 'El infusor no está activo o no aplica al medicamento.',
                        ]);
                    }
                }
            }

            $prevalidationPayload = [
                'medical_unit_code' => $unitCode,
                'catalog_type' => $mixtureType,
                'items' => $integrationItems,
            ];
            if (filled($data['integration_catalog_version'] ?? null)) {
                $prevalidationPayload['catalog_version'] = $data['integration_catalog_version'];
            }

            try {
                $prevalidation = $cbta->prevalidateMixture($prevalidationPayload);
            } catch (Throwable) {
                throw ValidationException::withMessages([
                    'integration_items' => 'Mezclas no esta disponible para prevalidar la solicitud. No se guardo ningun registro.',
                ]);
            }

            if (! $prevalidation['valid']) {
                $messages = collect($prevalidation['errors'])
                    ->pluck('message')
                    ->filter()
                    ->unique()
                    ->join(' ');
                throw ValidationException::withMessages([
                    'integration_items' => $messages ?: 'La solicitud fue rechazada durante la prevalidacion de Mezclas.',
                ]);
            }
        }

        $prefix = ['clinical_labs' => 'LAB', 'npt' => 'NPT', 'chemo' => 'ONC'][$data['request_type']];
        $provider = Provider::query()->where('provider_type', $data['request_type'])->where('status', 'active')->first()
            ?? Provider::query()->where('status', 'active')->first();
        $attachment = $request->file('authorization_file');
        $attachmentPath = $attachment?->store('doctor-requests', 'local');
        $clinicalFormat = match ($data['request_type']) {
            'chemo' => array_merge($data['oncology'] ?? [], ['medications' => $oncologyMedications]),
            'npt' => $data['npt'] ?? [],
            default => null,
        };
        $firstMedication = $oncologyMedications[0] ?? [];
        $requiredAt = $data['required_at'] ?? data_get($data, 'npt.delivery_at');

        try {
            $providerRequest = DB::transaction(function () use ($doctor, $data, $provider, $prefix, $clinicalFormat, $firstMedication, $requiredAt, $attachment, $attachmentPath, $integrationItems, $prevalidationPayload, $prevalidation): ProviderRequest {
            $providerRequest = ProviderRequest::query()->create([
                'provider_id' => $provider?->id,
                'patient_id' => $data['patient_id'],
                'medical_unit_id' => $doctor->medical_unit_id,
                'external_id' => $prefix.'-'.str_pad((string) (ProviderRequest::query()->max('id') + 1), 4, '0', STR_PAD_LEFT),
                'request_type' => $data['request_type'],
                'status' => 'requested',
                'requested_at' => now(),
                'required_at' => $requiredAt,
                'payload' => [
                    'source' => 'doctor_module',
                    'doctor_id' => $doctor->id,
                    'doctor' => $doctor->full_name,
                    'service' => $data['service'],
                    'diagnosis' => $data['diagnosis'],
                    'notes' => $data['notes'] ?? null,
                    'medication' => $data['medication'] ?? ($firstMedication['medication'] ?? null),
                    'dose' => $data['dose'] ?? ($firstMedication['dose'] ?? null),
                    'volume' => $data['volume'] ?? data_get($data, 'npt.total_volume'),
                    'priority' => $data['priority'] ?? 'routine',
                    'clinical_format' => $clinicalFormat,
                    'integration_items' => $integrationItems,
                    'attachment' => $attachmentPath ? [
                        'disk' => 'local',
                        'path' => $attachmentPath,
                        'original_name' => $attachment?->getClientOriginalName(),
                        'mime' => $attachment?->getMimeType(),
                        'size' => $attachment?->getSize(),
                    ] : null,
                    'authorizations' => $data['request_type'] === 'chemo'
                        ? ['oncology' => 'pending', 'pharmacy' => 'pending']
                        : ['nursing' => 'pending', 'pharmacy' => 'pending'],
                    'authorization_requirements' => \App\Support\MixtureAuthorizationPolicy::requirements($data['request_type']),
                ],
            ]);
            ProviderRequestStatusEvent::query()->create([
                'provider_request_id' => $providerRequest->id,
                'status' => 'requested',
                'actor' => $doctor->full_name,
                'occurred_at' => now(),
                'metadata' => ['source' => 'doctor_module'],
            ]);

            if ($prevalidation && $prevalidationPayload) {
                MixtureIntegration::query()->create([
                    'provider_request_id' => $providerRequest->id,
                    'local_external_id' => (string) Str::uuid(),
                    'sync_status' => 'awaiting_authorizations',
                    'catalog_version' => $prevalidation['catalog_version'],
                    'payload_hash' => hash('sha256', json_encode($prevalidationPayload, JSON_THROW_ON_ERROR)),
                    'last_synced_at' => now(),
                    'metadata' => [
                        'catalog_type' => $prevalidation['catalog_type'],
                        'medical_unit_code' => data_get($prevalidation, 'medical_unit.external_code'),
                        'items_count' => count($prevalidation['items']),
                        'prevalidation_valid' => true,
                    ],
                ]);
            }

                return $providerRequest;
            });
        } catch (Throwable $exception) {
            if ($attachmentPath) {
                Storage::disk('local')->delete($attachmentPath);
            }

            report($exception);

            return back()->withInput()->with('sweet_alert', [
                'icon' => 'error',
                'title' => 'No fue posible crear la solicitud',
                'text' => 'Ocurrió un problema al guardar la solicitud. No se creó ningún registro; revisa los datos e inténtalo nuevamente.',
            ]);
        }

        $audit->record($request, 'doctor.service_request.created', $providerRequest, 'doctor');

        return redirect()->route('doctor.dashboard', ['section' => 'requests'])
            ->with('sweet_alert', [
                'icon' => 'success',
                'title' => 'Solicitud creada correctamente',
                'text' => 'La solicitud fue prevalidada y enviada al área operativa. Se enviará a Mezclas cuando se completen las autorizaciones.',
            ]);
    }

    public function downloadMixtureDocument(
        Request $request,
        ProviderRequest $providerRequest,
        int $document,
        CbtaCatalogClient $client
    ): Response {
        $doctor = $this->resolveDoctor($request);
        abort_unless((int) data_get($providerRequest->payload, 'doctor_id') === $doctor->id, 404);

        $integration = $providerRequest->mixtureIntegration;
        abort_unless($integration?->cbta_request_id, 404);

        $documents = collect(data_get($integration->metadata, 'remote_documents', []));
        $metadata = $documents->first(fn ($item) => (int) data_get($item, 'id') === $document);
        abort_unless(is_array($metadata), 404);

        $download = $client->downloadMixtureDocument($integration->cbta_request_id, $document);
        $filename = basename((string) data_get($metadata, 'name', 'documento-'.$document));
        $filename = str_replace(['"', "\r", "\n"], '', $filename) ?: 'documento-'.$document;

        return response($download['contents'], 200, [
            'Content-Type' => $download['mime_type'],
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function downloadMixtureRemission(
        Request $request,
        ProviderRequest $providerRequest,
        CbtaCatalogClient $client
    ): Response {
        $doctor = $this->resolveDoctor($request);
        abort_unless((int) data_get($providerRequest->payload, 'doctor_id') === $doctor->id, 404);

        $integration = $providerRequest->mixtureIntegration;
        abort_unless($integration?->cbta_request_id, 404);
        abort_unless(data_get($providerRequest->payload, 'cbta.remission.available') === true, 404);

        $download = $client->downloadMixtureRemission($integration->cbta_request_id);
        $number = preg_replace('/[^A-Za-z0-9_-]/', '-', (string) data_get(
            $providerRequest->payload,
            'cbta.remission.number',
            $providerRequest->external_id
        ));

        return response($download['contents'], 200, [
            'Content-Type' => $download['mime_type'],
            'Content-Disposition' => 'attachment; filename="remision-'.$number.'.pdf"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function transitionAppointment(Appointment $appointment, string $nextStatus, Request $request, string $source): void
    {
        $previousStatus = $appointment->status;

        if ($previousStatus === $nextStatus) {
            return;
        }

        $appointment->update(['status' => $nextStatus]);
        AppointmentStatusEvent::query()->create([
            'appointment_id' => $appointment->id,
            'changed_by' => $request->user()?->id,
            'from_status' => $previousStatus,
            'to_status' => $nextStatus,
            'metadata' => ['source' => $source],
        ]);
    }
    private function patientBelongsToDoctor(Doctor $doctor, int $patientId): bool
    {
        return Patient::query()->whereKey($patientId)->where(function ($query) use ($doctor): void {
            $query->where('primary_doctor_id', $doctor->id)
                ->orWhereHas('appointments', fn ($appointments) => $appointments->where('doctor_id', $doctor->id))
                ->orWhereHas('prescriptions', fn ($prescriptions) => $prescriptions->where('doctor_id', $doctor->id))
                ->orWhereHas('clinicalEncounters', fn ($encounters) => $encounters->where('doctor_id', $doctor->id));
        })->exists();
    }

    private function validatePatient(Request $request, ?Patient $patient = null): array
    {
        return $request->validate([
            'platform_number' => ['nullable', 'string', 'max:80', Rule::unique('patients', 'platform_number')->ignore($patient?->id)],
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:160'],
            'curp' => ['nullable', 'string', 'max:18', Rule::unique('patients', 'curp')->ignore($patient?->id)],
            'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'sex' => ['nullable', Rule::in(['Femenino', 'Masculino', 'Otro'])],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:180'],
            'address' => ['nullable', 'string', 'max:500'],
            'general_observations' => ['nullable', 'string', 'max:3000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }

    private function resolveDoctor(Request $request): Doctor
    {
        $user = $request->user();

        if ($user?->doctor) {
            return $user->doctor;
        }

        abort_unless(in_array($user?->role, ['superadmin', 'admin'], true), 403);

        return Doctor::query()
            ->with('user')
            ->latest()
            ->firstOrFail();
    }
}

