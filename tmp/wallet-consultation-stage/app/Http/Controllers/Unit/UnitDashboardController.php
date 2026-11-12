<?php

namespace App\Http\Controllers\Unit;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentStatusEvent;
use App\Models\ContractedService;
use App\Models\Doctor;
use App\Models\InventoryItem;
use App\Models\MedicationCatalogItem;
use App\Models\UnitMedicationSetting;
use App\Models\MedicalUnit;
use App\Models\OperationalArea;
use App\Models\OperationalProfile;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Provider;
use App\Models\ProviderRequest;
use App\Models\ProviderRequestStatusEvent;
use App\Models\ProcedureArea;
use App\Models\Service;
use App\Models\User;
use App\Services\AppointmentSchedulingService;
use App\Services\Platform\PlatformAuditService;
use App\Services\Platform\DomainStateTransitionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UnitDashboardController extends Controller
{
    public function downloadServiceReport(Request $request, ContractedService $contract): StreamedResponse
    {
        $unit = $this->resolveUnit($request);
        abort_unless((int) $contract->medical_unit_id === (int) $unit->id, 403);

        $contract->loadMissing('service');
        $serviceKey = $this->serviceKey($contract->service);
        $filename = 'reporte-'.str($contract->service?->name ?? 'servicio')->slug().'-'.now()->format('Ymd-His').'.csv';

        if ($serviceKey === 'consulta-externa') {
            $appointments = Appointment::query()
                ->with(['patient', 'doctor', 'medicalUnit'])
                ->where('medical_unit_id', $unit->id)
                ->latest('starts_at')
                ->get();

            return response()->streamDownload(function () use ($appointments): void {
                $output = fopen('php://output', 'wb');
                fwrite($output, "\xEF\xBB\xBF");
                fputcsv($output, ['Folio', 'Fecha', 'Paciente', 'Hospital', 'Medico', 'Especialidad', 'Estatus', 'Ultima actualizacion']);
                foreach ($appointments as $appointment) {
                    fputcsv($output, [
                        data_get($appointment->metadata, 'folio') ?? 'CE-'.optional($appointment->created_at)->format('Y').'-'.str_pad((string) $appointment->id, 5, '0', STR_PAD_LEFT),
                        optional($appointment->starts_at)->format('d/m/Y H:i'),
                        $appointment->patient?->full_name,
                        $appointment->medicalUnit?->name,
                        $appointment->doctor?->full_name,
                        $appointment->specialty,
                        $appointment->status,
                        optional($appointment->updated_at)->format('d/m/Y H:i'),
                    ]);
                }
                fclose($output);
            }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        $requestTypes = match ($serviceKey) {
            'nutricion-parenteral' => ['npt', 'nutrition'],
            'quimioterapias' => ['chemo', 'chemotherapy'],
            'central-de-mezclas' => ['npt', 'nutrition', 'chemo', 'chemotherapy'],
            'laboratorio' => ['lab', 'laboratory', 'clinical-lab', 'clinical-laboratory'],
            'hemodinamia' => ['hemodynamics', 'hemodinamia'],
            'mantenimiento-equipo-medico' => ['maintenance', 'equipment-maintenance'],
            'osteosintesis' => ['osteosynthesis', 'osteosintesis'],
            default => [$serviceKey],
        };
        $requests = ProviderRequest::query()
            ->with(['patient', 'provider'])
            ->where('medical_unit_id', $unit->id)
            ->whereIn('request_type', $requestTypes)
            ->orderByDesc('requested_at')
            ->get();

        return response()->streamDownload(function () use ($requests): void {
            $output = fopen('php://output', 'wb');
            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, ['Folio', 'Fecha', 'Paciente', 'Proveedor', 'Tipo', 'Estatus', 'Fecha requerida']);
            foreach ($requests as $providerRequest) {
                fputcsv($output, [
                    $providerRequest->external_id,
                    optional($providerRequest->requested_at)->format('d/m/Y H:i'),
                    $providerRequest->patient?->full_name,
                    $providerRequest->provider?->name,
                    $providerRequest->request_type,
                    $providerRequest->status,
                    optional($providerRequest->required_at)->format('d/m/Y H:i'),
                ]);
            }
            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function serviceKey(?Service $service): string
    {
        $externalId = str($service?->external_id ?? '')->lower()->slug('-')->toString();
        $knownExternalIds = [
            'consulta-externa',
            'hemodinamia',
            'laboratorio',
            'nutricion-parenteral',
            'quimioterapias',
            'central-de-mezclas',
            'mantenimiento-equipo-medico',
            'osteosintesis',
            'farmacia-externa',
        ];

        if (in_array($externalId, $knownExternalIds, true)) {
            return $externalId;
        }

        $serviceText = str(collect([
            $service?->external_id,
            $service?->name,
            $service?->category,
            $service?->specialty,
        ])->filter()->implode(' '))->lower()->toString();

        return match (true) {
            str_contains($serviceText, 'consulta') => 'consulta-externa',
            str_contains($serviceText, 'hemodinam') => 'hemodinamia',
            str_contains($serviceText, 'laboratorio') || str_contains($serviceText, 'analisis') => 'laboratorio',
            str_contains($serviceText, 'nutricion') => 'nutricion-parenteral',
            str_contains($serviceText, 'central') && str_contains($serviceText, 'mezcla') => 'central-de-mezclas',
            str_contains($serviceText, 'quimio') || str_contains($serviceText, 'oncolo') => 'quimioterapias',
            str_contains($serviceText, 'mantenimiento') || str_contains($serviceText, 'equipo') => 'mantenimiento-equipo-medico',
            str_contains($serviceText, 'osteo') => 'osteosintesis',
            default => $externalId ?: str($service?->name ?? 'servicio')->slug('-')->toString(),
        };
    }

    public function index(Request $request): View
    {
        $unit = $this->resolveUnit($request);
        $section = $request->string('section')->toString() ?: 'services';
        if (! in_array($section, ['profile', 'services', 'catalog', 'users', 'patients', 'doctors', 'specialties', 'external-pharmacy', 'procedure-areas', 'medications', 'administration', 'personnel-services', 'agents'], true)) {
            $section = 'services';
        }

        $unit->load([
            'institution',
            'contractedServices.service',
            'operationalProfiles.user',
            'operationalProfiles.area',
            'doctors.user',
        ]);

        $appointments = Appointment::query()
            ->with([
                'patient',
                'doctor',
                'medicalUnit',
                'procedureArea',
                'statusEvents' => fn ($query) => $query->latest('created_at'),
            ])
            ->where('medical_unit_id', $unit->id)
            ->latest('starts_at')
            ->get();

        $providerRequests = ProviderRequest::query()
            ->with(['provider', 'patient', 'medicalUnit'])
            ->withCount([
                'interactions as message_count' => fn ($query) => $query->where('type', 'message'),
                'interactions as open_adjustment_count' => fn ($query) => $query->where('type', 'adjustment')->where('status', 'open'),
            ])
            ->where('medical_unit_id', $unit->id)
            ->latest('requested_at')
            ->get();

        $inventory = InventoryItem::query()
            ->with('product')
            ->where('medical_unit_id', $unit->id)
            ->latest()
            ->limit(10)
            ->get();

        $patients = \App\Support\UnitPatientCatalog::query($unit)
            ->orderBy('full_name')
            ->get();

        $editingPatient = $section === 'patients' && $request->filled('edit_patient')
            ? \App\Support\UnitPatientCatalog::query($unit)->findOrFail($request->integer('edit_patient'))
            : null;

        $consultationPatientCatalog = Patient::query()
            ->where('status', 'active')
            ->orderBy('full_name')
            ->limit(300)
            ->get();

        $consultationRooms = ProcedureArea::query()
            ->with('schedules')
            ->where('medical_unit_id', $unit->id)
            ->where('type', 'consulting')
            ->orderBy('unit_number')
            ->get();

        $consultationPrescriptions = Prescription::query()
            ->with(['patient', 'doctor', 'items.medication'])
            ->where(function ($query) use ($unit): void {
                $query->whereHas('doctor', fn ($doctorQuery) => $doctorQuery->where('medical_unit_id', $unit->id))
                    ->orWhere('metadata->medical_unit_id', $unit->id);
            })
            ->latest('issued_at')
            ->limit(100)
            ->get();

        $specialties = Service::query()
            ->orderBy('specialty')
            ->orderBy('name')
            ->get();

        $medicationCatalog = MedicationCatalogItem::query()
            ->with(['unitSettings' => fn ($query) => $query->where('medical_unit_id', $unit->id)])
            ->where(function ($query) use ($unit): void {
                $query->whereNull('institution_id');
                if ($unit->institution_id) {
                    $query->orWhere('institution_id', $unit->institution_id);
                }
            })
            ->orderBy('name')
            ->get();

        $medicationStock = InventoryItem::query()
            ->join('pharmacy_products', 'pharmacy_products.id', '=', 'inventory_items.pharmacy_product_id')
            ->where('inventory_items.medical_unit_id', $unit->id)
            ->select('pharmacy_products.cnis')
            ->selectRaw('SUM(inventory_items.quantity) as quantity')
            ->groupBy('pharmacy_products.cnis')
            ->pluck('quantity', 'cnis');

        return view('unit.dashboard', [
            'unit' => $unit,
            'section' => $section,
            'appointments' => $appointments,
            'providerRequests' => $providerRequests,
            'inventory' => $inventory,
            'patients' => $patients,
            'editingPatient' => $editingPatient,
            'consultationPatientCatalog' => $consultationPatientCatalog,
            'specialties' => $specialties,
            'consultationRooms' => $consultationRooms,
            'consultationPrescriptions' => $consultationPrescriptions,
            'externalPharmacyCatalog' => $medicationCatalog,
            'medicationCatalog' => $medicationCatalog,
            'medicationStock' => $medicationStock,
            'operationalAreas' => OperationalArea::query()->orderBy('label')->get(),
            'metrics' => [
                'Camas' => $unit->beds,
                'Medicos' => $unit->doctors->count(),
                'Areas operativas' => $unit->operationalProfiles->count(),
                'Servicios activos' => $unit->contractedServices->where('status', 'active')->count(),
                'Citas programadas' => Appointment::query()
                    ->where('medical_unit_id', $unit->id)
                    ->where('status', 'scheduled')
                    ->count(),
                'Solicitudes abiertas' => ProviderRequest::query()
                    ->where('medical_unit_id', $unit->id)
                    ->whereNotIn('status', ['delivered', 'cancelled', 'rejected'])
                    ->count(),
            ],
        ]);
    }

    public function storeAppointment(
        Request $request,
        PlatformAuditService $audit,
        AppointmentSchedulingService $scheduling,
    ): RedirectResponse {
        $unit = $this->resolveUnit($request);
        $data = $this->validateConsultationAppointment($request, $unit);
        [$selectedDoctor, $room, $startsAt, $endsAt] = $this->resolveConsultationSchedule($data, $unit);

        $appointment = DB::transaction(function () use ($data, $selectedDoctor, $unit, $room, $startsAt, $endsAt, $scheduling): Appointment {
            $room = ProcedureArea::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();
            $doctor = $selectedDoctor
                ? Doctor::query()
                    ->whereKey($selectedDoctor->id)
                    ->where('medical_unit_id', $unit->id)
                    ->where('status', 'active')
                    ->lockForUpdate()
                    ->firstOrFail()
                : null;
            $scheduling->assertInstitutionalConsultationAvailable($doctor, $startsAt, $endsAt, $room);

            $appointment = Appointment::query()->create([
                'patient_id' => $data['patient_id'],
                'doctor_id' => $doctor?->id,
                'medical_unit_id' => $unit->id,
                'procedure_area_id' => $room->id,
                'specialty' => $data['specialty'],
                'modality' => $data['modality'],
                'location' => $room->unit_number ?: $room->location,
                'status' => 'scheduled',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'reason' => $data['reason'],
                'metadata' => [
                    'source' => 'unit_consultation_calendar',
                    'notes' => $data['notes'] ?? null,
                    'patient_platform_number' => $data['platform_number'],
                    'priority' => $data['priority'],
                    'notifications' => [
                        'email' => (bool) ($data['notify_email'] ?? false),
                        'sms' => (bool) ($data['notify_sms'] ?? false),
                    ],
                ],
            ]);

            $metadata = $appointment->metadata ?? [];
            $metadata['folio'] = 'CE-'.$startsAt->format('Y').'-'.str_pad((string) $appointment->id, 6, '0', STR_PAD_LEFT);
            $appointment->forceFill(['metadata' => $metadata])->save();

            return $appointment;
        });

        $audit->record($request, 'unit.appointment.created', $appointment, 'unit', [
            'unit_id' => $unit->id,
            'starts_at' => $startsAt->toISOString(),
        ]);

        return redirect()->route('unit.dashboard', [
            'unit' => $unit->id,
            'calendar_date' => $startsAt->toDateString(),
        ])->with('status', 'Cita agendada correctamente.');
    }

    public function storeNutritionRequest(Request $request, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        $data = $request->validate([
            'service_contract_id' => ['required', 'integer', 'exists:contracted_services,id'],
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'doctor_id' => ['required', 'integer', 'exists:doctors,id'],
            'clinical_service' => ['required', 'string', 'max:180'],
            'priority' => ['required', Rule::in(['routine', 'urgent'])],
            'delivery_at' => ['required', 'date'],
            'route' => ['required', Rule::in(['Central', 'Periferica'])],
            'npt_type' => ['required', Rule::in(['Individualizada', 'Tricamara', 'Pediatrica'])],
            'total_volume' => ['required', 'numeric', 'min:0.01', 'max:100000'],
            'infusion_hours' => ['required', 'numeric', 'min:0.01', 'max:168'],
            'diagnosis' => ['required', 'string', 'max:2000'],
            'components' => ['nullable', 'string', 'max:3000'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $contract = ContractedService::query()
            ->with('service')
            ->whereKey($data['service_contract_id'])
            ->where('medical_unit_id', $unit->id)
            ->where('status', 'active')
            ->firstOrFail();
        abort_unless($this->serviceKey($contract->service) === 'nutricion-parenteral', 422, 'El servicio seleccionado no corresponde a nutricion parenteral.');

        $patient = Patient::query()->whereKey($data['patient_id'])->where('status', 'active')->firstOrFail();
        $doctor = Doctor::query()
            ->whereKey($data['doctor_id'])
            ->where('medical_unit_id', $unit->id)
            ->where('status', 'active')
            ->firstOrFail();
        $provider = Provider::query()
            ->whereIn('provider_type', ['npt', 'nutrition'])
            ->where('status', 'active')
            ->first()
            ?? Provider::query()->where('status', 'active')->first();
        $requiredAt = Carbon::parse($data['delivery_at']);
        $externalId = 'NPT-'.now()->format('Ymd').'-'.str_pad((string) (ProviderRequest::query()->max('id') + 1), 4, '0', STR_PAD_LEFT);

        $providerRequest = DB::transaction(function () use ($request, $unit, $patient, $doctor, $provider, $contract, $data, $requiredAt, $externalId): ProviderRequest {
            $providerRequest = ProviderRequest::query()->create([
                'provider_id' => $provider?->id,
                'patient_id' => $patient->id,
                'medical_unit_id' => $unit->id,
                'external_id' => $externalId,
                'request_type' => 'npt',
                'status' => 'requested',
                'requested_at' => now(),
                'required_at' => $requiredAt,
                'payload' => [
                    'source' => 'unit_nutrition_board',
                    'service_contract_id' => $contract->id,
                    'request_number' => $externalId,
                    'request_type_label' => 'Nutricional',
                    'service' => $contract->service?->name ?? 'Nutricion Parenteral',
                    'doctor_id' => $doctor->id,
                    'doctor' => $doctor->full_name,
                    'diagnosis' => $data['diagnosis'],
                    'notes' => $data['notes'] ?? null,
                    'priority' => $data['priority'],
                    'volume' => $data['total_volume'],
                    'clinical_format' => [
                        'clinical_service' => $data['clinical_service'],
                        'registration' => $patient->platform_number,
                        'birth_date' => $patient->birth_date?->toDateString(),
                        'sex' => $patient->sex,
                        'route' => $data['route'],
                        'infusion_hours' => $data['infusion_hours'],
                        'total_volume' => $data['total_volume'],
                        'npt_type' => $data['npt_type'],
                        'components' => $data['components'] ?? null,
                        'delivery_at' => $requiredAt->toDateTimeString(),
                        'destination_hospital' => $unit->name,
                        'doctor_name' => $doctor->full_name,
                        'professional_license' => $doctor->professional_license,
                    ],
                    'authorizations' => ['operational' => 'pending', 'pharmacy' => 'pending'],
                    'authorization_requirements' => ['operational', 'pharmacy'],
                ],
            ]);

            ProviderRequestStatusEvent::query()->create([
                'provider_request_id' => $providerRequest->id,
                'status' => 'requested',
                'actor' => $request->user()?->name,
                'occurred_at' => now(),
                'metadata' => ['source' => 'unit_nutrition_board'],
            ]);

            return $providerRequest;
        });

        $audit->record($request, 'unit.nutrition_request.created', $providerRequest, 'unit', [
            'unit_id' => $unit->id,
            'service_contract_id' => $contract->id,
        ]);

        return redirect()->route('unit.dashboard', [
            'unit' => $unit->id,
            'section' => 'services',
            'service' => $contract->id,
        ])->with('status', 'Solicitud de mezcla registrada correctamente.');
    }

    public function updateAppointment(
        Request $request,
        Appointment $appointment,
        PlatformAuditService $audit,
        DomainStateTransitionService $transitions,
        AppointmentSchedulingService $scheduling,
    ): RedirectResponse {
        $this->authorizeAppointmentOwnership($request, $appointment);
        $unit = $this->resolveUnit($request);
        $data = $this->validateConsultationAppointment($request, $unit, true);
        [$doctor, $room, $startsAt, $endsAt] = $this->resolveConsultationSchedule($data, $unit);

        $scheduling->assertInstitutionalConsultationAvailable($doctor, $startsAt, $endsAt, $room, $appointment->id);

        $previousStatus = $appointment->status;
        if ($previousStatus !== $data['status']) {
            $transitions->assertAllowed('appointment', $previousStatus, $data['status']);
        }

        $metadata = $appointment->metadata ?? [];
        $metadata['notes'] = $data['notes'] ?? null;
        $metadata['last_updated_from'] = 'unit_consultation_calendar';
        $metadata['last_updated_by'] = $request->user()?->id;
        if (array_key_exists('priority', $data)) {
            $metadata['priority'] = $data['priority'];
        }
        if (array_key_exists('notify_email', $data) || array_key_exists('notify_sms', $data)) {
            $metadata['notifications'] = [
                'email' => (bool) ($data['notify_email'] ?? false),
                'sms' => (bool) ($data['notify_sms'] ?? false),
            ];
        }

        DB::transaction(function () use (&$appointment, $data, $doctor, $room, $startsAt, $endsAt, $metadata, &$previousStatus, $request, $transitions): void {
            $appointment = Appointment::query()->whereKey($appointment->id)->lockForUpdate()->firstOrFail();
            $this->authorizeAppointmentOwnership($request, $appointment);
            $previousStatus = $appointment->status;
            $transitions->assertAllowed('appointment', $previousStatus, $data['status']);
            $appointment->update([
                'doctor_id' => $doctor?->id,
                'procedure_area_id' => $room->id,
                'specialty' => $data['specialty'],
                'modality' => $data['modality'],
                'location' => $room->unit_number ?: $room->location,
                'status' => $data['status'],
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'reason' => $data['reason'],
                'metadata' => $metadata,
            ]);

            if ($previousStatus !== $data['status']) {
                AppointmentStatusEvent::query()->create([
                    'appointment_id' => $appointment->id,
                    'changed_by' => $request->user()?->id,
                    'from_status' => $previousStatus,
                    'to_status' => $data['status'],
                    'notes' => $data['notes'] ?? null,
                    'metadata' => ['source' => 'unit_consultation_calendar'],
                ]);
            }
        });

        $audit->record($request, 'unit.appointment.updated', $appointment, 'unit', [
            'starts_at' => $startsAt->toISOString(),
            'status' => $data['status'],
        ]);

        return redirect()->route('unit.dashboard', [
            'unit' => $unit->id,
            'calendar_date' => $startsAt->toDateString(),
        ])->with('status', 'Cita actualizada correctamente.');
    }

    public function updateAppointmentStatus(Request $request, Appointment $appointment, PlatformAuditService $audit, DomainStateTransitionService $transitions): RedirectResponse
    {
        $this->authorizeAppointmentOwnership($request, $appointment);

        $data = $request->validate([
            'status' => ['required', Rule::in(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])],
            'notes' => [Rule::requiredIf(fn () => $request->string('status')->toString() === 'cancelled'), 'nullable', 'string', 'max:500'],
        ]);

        $previousStatus = $appointment->status;
        $transitions->assertAllowed('appointment', $previousStatus, $data['status']);

        $metadata = $appointment->metadata ?? [];
        $metadata['last_status_note'] = $data['notes'] ?? null;
        $metadata['last_status_changed_by'] = $request->user()?->id;
        $metadata['last_status_changed_at'] = now()->toISOString();

        DB::transaction(function () use (&$appointment, $data, $metadata, &$previousStatus, $request, $transitions): void {
            $appointment = Appointment::query()->whereKey($appointment->id)->lockForUpdate()->firstOrFail();
            $this->authorizeAppointmentOwnership($request, $appointment);
            $previousStatus = $appointment->status;
            $transitions->assertAllowed('appointment', $previousStatus, $data['status']);
            $appointment->update([
                'status' => $data['status'],
                'metadata' => $metadata,
            ]);
            AppointmentStatusEvent::query()->create([
                'appointment_id' => $appointment->id,
                'changed_by' => $request->user()?->id,
                'from_status' => $previousStatus,
                'to_status' => $data['status'],
                'notes' => $data['notes'] ?? null,
                'metadata' => ['source' => 'unit'],
            ]);
        });

        $audit->record($request, 'unit.appointment.status_updated', $appointment, 'unit', [
            'status' => $appointment->status,
        ]);

        return back()->with('status', 'Cita actualizada desde unidad.');
    }

    public function updateProfile(Request $request, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        $data = $request->validate([
            'public_name' => ['required', 'string', 'max:255'],
            'general_info' => ['nullable', 'string', 'max:3000'],
            'services' => ['nullable', 'string', 'max:3000'],
            'news' => ['nullable', 'string', 'max:3000'],
            'social_text' => ['nullable', 'string', 'max:3000'],
            'stationery_note' => ['nullable', 'string', 'max:3000'],
            'profile_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['nullable', 'boolean'],
        ]);

        $metadata = $unit->metadata ?? [];
        $profile = $metadata['profile'] ?? [];

        if ($request->boolean('remove_image') && filled($profile['image_path'] ?? null)) {
            Storage::disk('public')->delete($profile['image_path']);
            unset($profile['image_path']);
        }

        if ($request->hasFile('profile_image')) {
            if (filled($profile['image_path'] ?? null)) {
                Storage::disk('public')->delete($profile['image_path']);
            }
            $profile['image_path'] = $request->file('profile_image')->store('unit-profiles', 'public');
        }

        foreach (['public_name', 'general_info', 'services', 'news', 'social_text', 'stationery_note'] as $field) {
            $profile[$field] = $data[$field] ?? '';
        }
        $metadata['profile'] = $profile;
        $unit->update(['metadata' => $metadata]);

        $audit->record($request, 'unit.profile.updated', $unit, 'unit', ['public_name' => $profile['public_name']]);

        return redirect()->route('unit.dashboard', ['section' => 'profile'])->with('status', 'Perfil de la unidad actualizado.');
    }

    public function storeOperationalUser(Request $request, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        $data = $this->validateOperationalUser($request);
        $user = User::query()->create(['name' => $data['name'], 'username' => $data['username'], 'email' => filter_var($data['username'], FILTER_VALIDATE_EMAIL) ? $data['username'] : null, 'password' => Hash::make($data['password']), 'role' => 'operational', 'module' => 'operational', 'status' => 'active']);
        $profile = OperationalProfile::query()->create(['user_id' => $user->id, 'medical_unit_id' => $unit->id, 'operational_area_id' => $data['operational_area_id'], 'role_label' => $data['role_label'], 'permissions' => $data['permissions'] ?? [], 'status' => 'active', 'metadata' => ['authority' => $data['authority'], 'service' => $data['service'], 'demo_password' => $data['password']]]);
        $audit->record($request, 'unit.operational_user.created', $profile, 'unit', ['unit_id' => $unit->id]);
        return redirect()->route('unit.dashboard', array_filter(['section' => 'users', 'unit' => $request->filled('unit') ? $unit->id : null]))->with('status', 'Guardado correctamente');
    }

    public function updateOperationalUser(Request $request, OperationalProfile $profile, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        abort_unless((int) $profile->medical_unit_id === (int) $unit->id, 403);
        $data = $this->validateOperationalUser($request, $profile);
        $profile->user->update(array_filter(['name' => $data['name'], 'username' => $data['username'], 'email' => filter_var($data['username'], FILTER_VALIDATE_EMAIL) ? $data['username'] : null, 'password' => filled($data['password'] ?? null) ? Hash::make($data['password']) : null], fn ($value) => $value !== null));
        $metadata = $profile->metadata ?? [];
        $metadata['authority'] = $data['authority']; $metadata['service'] = $data['service'];
        if (filled($data['password'] ?? null)) $metadata['demo_password'] = $data['password'];
        $profile->update(['operational_area_id' => $data['operational_area_id'], 'role_label' => $data['role_label'], 'permissions' => $data['permissions'] ?? [], 'metadata' => $metadata]);
        $audit->record($request, 'unit.operational_user.updated', $profile, 'unit');
        return redirect()->route('unit.dashboard', array_filter(['section' => 'users', 'unit' => $request->filled('unit') ? $unit->id : null]))->with('status', 'Guardado correctamente');
    }

    public function destroyOperationalUser(Request $request, OperationalProfile $profile, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        abort_unless((int) $profile->medical_unit_id === (int) $unit->id, 403);
        $audit->record($request, 'unit.operational_user.deleted', $profile, 'unit');
        $profile->delete();
        return redirect()->route('unit.dashboard', array_filter(['section' => 'users', 'unit' => $request->filled('unit') ? $unit->id : null]))->with('status', 'Perfil operativo eliminado.');
    }

    public function storeDoctor(Request $request, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:180'],
            'platform_user' => ['nullable', 'string', 'max:180'],
            'professional_license' => ['required', 'string', 'max:80', Rule::unique('doctors', 'professional_license')],
            'specialty' => ['required', 'string', 'max:180'],
            'subspecialty' => ['nullable', 'string', 'max:180'],
            'services' => ['required', 'array', 'min:1'],
            'services.*' => ['string', 'max:180'],
        ]);
        $doctor = Doctor::query()->create([
            'medical_unit_id' => $unit->id,
            'full_name' => trim($data['first_name'].' '.$data['last_name']),
            'professional_license' => $data['professional_license'],
            'specialty' => $data['specialty'],
            'subspecialty' => $data['subspecialty'] ?? null,
            'service_name' => $data['services'][0],
            'status' => 'pending',
            'metadata' => ['platform_user' => $data['platform_user'] ?? null, 'services' => $data['services']],
        ]);
        $audit->record($request, 'unit.doctor.created', $doctor, 'unit', ['unit_id' => $unit->id]);
        return redirect()->route('unit.dashboard', ['section' => 'doctors'])->with('doctor_created', true);
    }

    public function updateDoctorAuthorizations(Request $request, Doctor $doctor, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        abort_unless((int) $doctor->medical_unit_id === (int) $unit->id, 403);
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'pending', 'inactive'])],
            'services' => ['required', 'array', 'min:1'],
            'services.*' => ['string', 'max:180'],
        ]);
        $metadata = $doctor->metadata ?? [];
        $metadata['services'] = array_values(array_unique($data['services']));
        $doctor->update(['status' => $data['status'], 'service_name' => $metadata['services'][0], 'metadata' => $metadata]);
        $audit->record($request, 'unit.doctor.authorizations.updated', $doctor, 'unit', ['services' => $metadata['services']]);
        return redirect()->route('unit.dashboard', ['section' => 'doctors'])->with('status', 'Autorizaciones del medico actualizadas.');
    }

    public function destroyDoctor(Request $request, Doctor $doctor, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        abort_unless((int) $doctor->medical_unit_id === (int) $unit->id, 403);
        $audit->record($request, 'unit.doctor.deleted', $doctor, 'unit');
        $doctor->delete();
        return redirect()->route('unit.dashboard', ['section' => 'doctors'])->with('status', 'Medico eliminado del catalogo local.');
    }

    public function updateExternalPharmacyStatus(Request $request, MedicationCatalogItem $medication, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        abort_unless($medication->institution_id === null || (int) $medication->institution_id === (int) $unit->institution_id, 403);
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'inactive'])]]);
        $medication->update(['status' => $data['status']]);
        $audit->record($request, 'unit.external_pharmacy.status.updated', $medication, 'unit', ['unit_id' => $unit->id]);
        return redirect()->route('unit.dashboard', ['section' => 'external-pharmacy'])->with('status', 'Estatus del medicamento actualizado.');
    }

    public function storeProcedureArea(Request $request, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(config('unit_areas')))],
            'location' => ['required', 'string', 'max:180'],
            'floor' => ['required', 'string', 'max:40'],
            'unit_number' => ['required', 'string', 'max:80'],
            'capacity' => ['required', 'integer', 'min:1', 'max:999'],
            'responsible' => ['nullable', 'string', 'max:180'],
            'schedule' => ['nullable', 'array'],
            'schedule.*.enabled' => ['nullable', 'boolean'],
            'schedule.*.start' => ['nullable', 'date_format:H:i'],
            'schedule.*.end' => ['nullable', 'date_format:H:i'],
        ]);
        $metadata = $unit->metadata ?? [];
        $areas = $metadata['procedure_areas'] ?? [];
        $areaId = (string) str()->uuid();
        $areas[] = [
            'id' => $areaId, 'type' => $data['type'], 'location' => $data['location'],
            'floor' => $data['floor'], 'unit_number' => $data['unit_number'], 'capacity' => $data['capacity'],
            'responsible' => $data['responsible'] ?: 'Sin responsable', 'schedule' => $data['schedule'] ?? [],
        ];
        $metadata['procedure_areas'] = $areas;
        DB::transaction(function () use ($unit, $metadata, $data, $areaId): void {
            $unit->update(['metadata' => $metadata]);
            $this->persistProcedureArea($unit, $areaId, $data);
        });
        $audit->record($request, 'unit.procedure_area.created', $unit, 'unit', ['type' => $data['type'], 'unit_number' => $data['unit_number']]);
        return redirect()->route('unit.dashboard', ['section' => 'procedure-areas', 'catalog' => $data['type']])->with('status', 'Subunidad registrada.');
    }

    public function updateProcedureArea(Request $request, string $areaId, PlatformAuditService $audit): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(config('unit_areas')))],
            'location' => ['required', 'string', 'max:180'], 'floor' => ['required', 'string', 'max:40'],
            'unit_number' => ['required', 'string', 'max:80'], 'capacity' => ['required', 'integer', 'min:1', 'max:999'],
            'responsible' => ['nullable', 'string', 'max:180'], 'schedule' => ['nullable', 'array'],
            'schedule.*.enabled' => ['nullable', 'boolean'], 'schedule.*.start' => ['nullable', 'date_format:H:i'],
            'schedule.*.end' => ['nullable', 'date_format:H:i'],
        ]);
        $metadata = $unit->metadata ?? [];
        $areas = $metadata['procedure_areas'] ?? [];
        $areas = \App\Support\UnitAreaCatalog::records($unit)->all();
        $index = collect($areas)->search(fn (array $area): bool => ($area['id'] ?? null) === $areaId);
        abort_if($index === false, 404);
        $areas[$index] = array_merge($areas[$index], [
            'type' => $data['type'], 'location' => $data['location'], 'floor' => $data['floor'],
            'unit_number' => $data['unit_number'], 'capacity' => $data['capacity'],
            'responsible' => $data['responsible'] ?: 'Sin responsable', 'schedule' => $data['schedule'] ?? [],
        ]);
        $metadata['procedure_areas'] = array_values($areas);
        DB::transaction(function () use ($unit, $metadata, $data, $areaId): void {
            $unit->update(['metadata' => $metadata]);
            $this->persistProcedureArea($unit, $areaId, $data);
        });
        $audit->record($request, 'unit.procedure_area.updated', $unit, 'unit', ['area_id' => $areaId]);
        return redirect()->route('unit.dashboard', ['section' => 'procedure-areas', 'catalog' => $data['type']])->with('status', 'Subunidad actualizada.');
    }

    private function persistProcedureArea(MedicalUnit $unit, string $sourceId, array $data): void
    {
        $attributes = [
                'type' => $data['type'],
                'location' => $data['location'],
                'floor' => $data['floor'],
                'unit_number' => $data['unit_number'],
                'simultaneous_capacity' => $data['capacity'],
                'responsible_name' => $data['responsible'] ?: 'Sin responsable',
            ];
        if (preg_match('/^native-(\d+)$/', $sourceId, $matches)) {
            $area = $unit->procedureAreas()->findOrFail((int) $matches[1]);
            $area->update($attributes);
        } else {
            $area = ProcedureArea::query()->updateOrCreate(
                ['medical_unit_id' => $unit->id, 'external_id' => $sourceId], $attributes,
            );
        }

        $days = ['sunday' => 0, 'monday' => 1, 'tuesday' => 2, 'wednesday' => 3, 'thursday' => 4, 'friday' => 5, 'saturday' => 6];
        $area->schedules()->delete();

        foreach ($data['schedule'] ?? [] as $day => $schedule) {
            if (! ($schedule['enabled'] ?? false) || ! isset($days[$day], $schedule['start'], $schedule['end'])) {
                continue;
            }

            $area->schedules()->create([
                'day_of_week' => $days[$day],
                'starts_at' => $schedule['start'],
                'ends_at' => $schedule['end'],
                'active' => true,
            ]);
        }
    }

    private function validateOperationalUser(Request $request, ?OperationalProfile $profile = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')->ignore($profile?->user_id)],
            'password' => [$profile ? 'nullable' : 'required', 'string', 'min:6', 'max:255'],
            'role_label' => ['required', Rule::in(['Responsable de Area', 'Operador'])],
            'authority' => ['required', 'string', 'max:150'],
            'service' => ['required', 'string', 'max:180'],
            'operational_area_id' => ['required', 'integer', Rule::exists('operational_areas', 'id')],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(['history', 'detail', 'manage', 'reports'])],
        ]);
    }

    private function validateConsultationAppointment(Request $request, MedicalUnit $unit, bool $updating = false): array
    {
        $data = $request->validate([
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->where('status', 'active')],
            'platform_number' => [$updating ? 'nullable' : 'required', 'nullable', 'string', 'max:80', Rule::exists('patients', 'platform_number')->where('status', 'active')],
            'doctor_id' => ['nullable', 'integer', Rule::exists('doctors', 'id')->where(fn ($query) => $query
                ->where('medical_unit_id', $unit->id)
                ->where('status', 'active'))],
            'procedure_area_id' => [
                'required',
                'integer',
                Rule::exists('procedure_areas', 'id')->where(fn ($query) => $query
                    ->where('medical_unit_id', $unit->id)
                    ->where('type', 'consulting')
                    ->where('status', 'active')),
            ],
            'specialty' => ['required', 'string', 'max:160'],
            'modality' => ['required', Rule::in(['Presencial', 'Video llamada'])],
            'appointment_date' => ['required', 'date_format:Y-m-d', ...($updating ? [] : ['after_or_equal:today'])],
            'appointment_time' => ['required', 'date_format:H:i'],
            'duration' => ['required', 'integer', Rule::in([20, 30, 45, 60])],
            'priority' => [$updating ? 'nullable' : 'required', 'nullable', Rule::in(['routine', 'urgent'])],
            'reason' => ['required', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
            'notify_email' => ['nullable', 'boolean'],
            'notify_sms' => ['nullable', 'boolean'],
            'status' => [$updating ? 'required' : 'nullable', Rule::in(['scheduled', 'confirmed', 'in_progress', 'completed'])],
        ]);

        if (! empty($data['platform_number']) && ! Patient::query()
            ->whereKey($data['patient_id'])
            ->where('platform_number', $data['platform_number'])
            ->where('status', 'active')
            ->exists()) {
            throw ValidationException::withMessages([
                'platform_number' => 'El numero de ID de la plataforma no corresponde al paciente seleccionado.',
            ]);
        }

        return $data;
    }

    public function updateMedicationStatus(Request $request, MedicationCatalogItem $medication, PlatformAuditService $audit): RedirectResponse|JsonResponse
    {
        $unit = $this->resolveUnit($request);
        abort_unless($medication->institution_id === null || (int) $medication->institution_id === (int) $unit->institution_id, 403);
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        abort_if($medication->status !== 'active' && $data['is_active'], 422, 'El medicamento está inactivo en la institución.');

        $setting = UnitMedicationSetting::query()->updateOrCreate(
            ['medical_unit_id' => $unit->id, 'medication_catalog_item_id' => $medication->id],
            ['is_active' => (bool) $data['is_active']],
        );
        $audit->record($request, 'unit.medication.status.updated', $setting, 'unit', [
            'unit_id' => $unit->id,
            'medication_id' => $medication->id,
            'is_active' => $setting->is_active,
        ]);

        if ($request->expectsJson()) {
            return response()->json(['is_active' => $setting->is_active]);
        }

        return redirect()
            ->route('unit.dashboard', ['unit' => $unit->id, 'section' => 'medications']);
    }

    private function resolveConsultationSchedule(array $data, MedicalUnit $unit): array
    {
        $doctor = empty($data['doctor_id']) ? null : Doctor::query()
            ->where('medical_unit_id', $unit->id)
            ->findOrFail($data['doctor_id']);
        $room = ProcedureArea::query()
            ->where('medical_unit_id', $unit->id)
            ->where('type', 'consulting')
            ->findOrFail($data['procedure_area_id']);
        $startsAt = Carbon::createFromFormat('Y-m-d H:i', $data['appointment_date'].' '.$data['appointment_time']);
        $endsAt = $startsAt->copy()->addMinutes((int) $data['duration']);

        return [$doctor, $room, $startsAt, $endsAt];
    }

    private function authorizeAppointmentOwnership(Request $request, Appointment $appointment): void
    {
        $user = $request->user();

        if (in_array($user?->role, ['superadmin', 'admin'], true)) {
            return;
        }

        $unit = $this->resolveUnit($request);

        abort_unless(
            (int) $appointment->medical_unit_id === (int) $unit->id,
            403,
            'No puedes modificar citas de otra unidad.',
        );
    }

    public function saveAreaValidation(Request $request, PlatformAuditService $audit, ?string $ruleId = null): RedirectResponse
    {
        $unit = $this->resolveUnit($request);
        $areas = array_keys(\App\Support\UnitAreaCatalog::navigation());
        $data = $request->validate([
            'requester_area' => ['required', Rule::in($areas)],
            'scope' => ['required', Rule::in(['all', 'service', 'product'])],
            'service_id' => ['nullable', 'required_if:scope,service', 'integer', 'exists:services,id'],
            'product_id' => ['nullable', 'required_if:scope,product', 'integer', Rule::exists('medication_catalog_items', 'id')->where(fn ($query) => $query->where(fn ($scope) => $scope->whereNull('institution_id')->orWhere('institution_id', $unit->institution_id)))],
            'review_areas' => ['nullable', 'array', 'max:20'],
            'review_areas.*' => ['required', 'distinct', Rule::in($areas), 'different:requester_area'],
            'authorize_areas' => ['nullable', 'array', 'max:20'],
            'authorize_areas.*' => ['required', 'distinct', Rule::in($areas), 'different:requester_area'],
            'status' => ['required', Rule::in(['draft', 'active', 'inactive'])],
            'notes' => ['nullable', 'string', 'max:1000'],
            'version' => [$ruleId ? 'required' : 'nullable', 'integer', 'min:1'],
        ]);
        $data['review_areas'] = $data['review_areas'] ?? [];
        $data['authorize_areas'] = $data['authorize_areas'] ?? [];
        if ($data['status'] === 'active' && !$data['review_areas'] && !$data['authorize_areas']) {
            throw ValidationException::withMessages(['review_areas' => 'Selecciona al menos un área de visto bueno o autorización para activar la regla.']);
        }
        $data['service_id'] = $data['scope'] === 'service' ? (int) $data['service_id'] : null;
        $data['product_id'] = $data['scope'] === 'product' ? (int) $data['product_id'] : null;
        $data['scope_label'] = match ($data['scope']) {
            'service' => Service::query()->findOrFail($data['service_id'])->name,
            'product' => MedicationCatalogItem::query()->findOrFail($data['product_id'])->name,
            default => 'Todos los productos y servicios',
        };

        DB::transaction(function () use ($request, $audit, $unit, $ruleId, $data): void {
            $lockedUnit = MedicalUnit::query()->lockForUpdate()->findOrFail($unit->id);
            $metadata = $lockedUnit->metadata ?? [];
            $rules = collect($metadata['area_validation_rules'] ?? [])->keyBy('id');
            $previous = $ruleId ? $rules->get($ruleId) : null;
            abort_if($ruleId && !$previous, 404);
            if ($previous && (int) $data['version'] !== (int) $previous['version']) {
                throw ValidationException::withMessages(['version' => 'Otra persona modificó esta regla. Recarga la página antes de volver a guardarla.']);
            }
            $id = $ruleId ?: (string) \Illuminate\Support\Str::uuid();
            $saved = array_merge($data, [
                'id' => $id, 'version' => ($previous['version'] ?? 0) + 1,
                'created_at' => $previous['created_at'] ?? now()->toISOString(),
                'updated_at' => now()->toISOString(), 'updated_by' => $request->user()->id,
            ]);
            $rules->put($id, $saved);
            $metadata['area_validation_rules'] = $rules->values()->all();
            $lockedUnit->update(['metadata' => $metadata]);
            $audit->record($request, 'unit.area_validation.saved', $lockedUnit, 'unit', ['rule_id' => $id, 'before' => $previous, 'after' => $saved]);
        });

        return redirect()->route('unit.dashboard', ['unit' => $unit->id, 'section' => 'procedure-areas', 'catalog' => $data['requester_area'], 'workspace' => 'validations'])
            ->with('status', 'Regla de validación guardada.');
    }

    private function resolveUnit(Request $request): MedicalUnit
    {
        $user = $request->user();

        if ($request->filled('unit')) {
            $requestedUnit = MedicalUnit::query()
                ->with('institution')
                ->findOrFail($request->integer('unit'));

            $canUseUnit = in_array($user?->role, ['superadmin', 'admin'], true)
                || ($user?->role === 'unit' && $requestedUnit->unit_username === $user->username)
                || ($user?->role === 'institution' && $user->institution && (int) $requestedUnit->institution_id === (int) $user->institution->id);

            abort_unless($canUseUnit, 403, 'No puedes consultar otra unidad.');

            return $requestedUnit;
        }

        if ($user?->role === 'unit') {
            return MedicalUnit::query()
                ->where('unit_username', $user->username)
                ->firstOrFail();
        }

        if ($user?->role === 'institution' && $user->institution) {
            return $user->institution
                ->medicalUnits()
                ->orderBy('name')
                ->firstOrFail();
        }

        abort_unless(in_array($user?->role, ['superadmin', 'admin'], true), 403);

        return MedicalUnit::query()
            ->with('institution')
            ->orderBy('id')
            ->firstOrFail();
    }
}
