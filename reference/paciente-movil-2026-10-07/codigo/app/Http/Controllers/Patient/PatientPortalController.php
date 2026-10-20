<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentStatusEvent;
use App\Models\Document;
use App\Models\Doctor;
use App\Models\InsurancePolicy;
use App\Models\Patient;
use App\Services\AppointmentSchedulingService;
use App\Services\Platform\PlatformAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class PatientPortalController extends Controller
{
    public function __invoke(Request $request, AppointmentSchedulingService $scheduling): View
    {
        $patient = $this->resolvePatient($request);

        $patient->load([
            'user',
            'primaryDoctor',
            'appointments.doctor',
            'appointments.medicalUnit',
            'clinicalRecords.doctor',
            'prescriptions.doctor',
            'prescriptions.items',
            'insurancePolicies',
            'diagnoses.doctor',
            'hospitalizations.hospital',
            'authorizations',
            'documents',
        ]);

        $bookingStart = now();
        $bookingEnd = $bookingStart->copy()->addDays(21)->endOfDay();
        $doctors = Doctor::query()
            ->with([
                'medicalUnit',
                'clinics' => fn ($query) => $query->where('status', 'active'),
                'availabilityRules' => fn ($query) => $query->where('status', 'published'),
                'availabilityExceptions' => fn ($query) => $query->whereDate('date_end', '>=', $bookingStart->toDateString()),
                'appointments' => fn ($query) => $query
                    ->whereNotIn('status', ['cancelled'])
                    ->whereBetween('starts_at', [$bookingStart->copy()->startOfDay(), $bookingEnd]),
            ])
            ->where('status', 'active')
            ->orderBy('full_name')
            ->get();
        $doctorBookingOptions = $doctors->mapWithKeys(function (Doctor $doctor) use ($scheduling, $bookingStart): array {
            $unit = $doctor->medicalUnit;
            $clinic = $doctor->clinics->firstWhere('location_type', 'in_person') ?? $doctor->clinics->first();
            $specialty = $doctor->specialty ?: 'Medicina general';
            $locationName = $unit?->name ?? $clinic?->name ?? 'Consulta privada';
            $locationAddress = $unit?->address
                ?? $clinic?->address
                ?? data_get($unit?->metadata, 'address')
                ?? collect([$unit?->city, $unit?->state])->filter()->implode(', ')
                ?: 'Ubicación por confirmar';

            return [$doctor->id => [
                'id' => $doctor->id,
                'name' => $doctor->full_name,
                'initials' => collect(explode(' ', $doctor->full_name))->filter()->take(2)->map(fn ($part) => mb_substr($part, 0, 1))->implode(''),
                'photo' => data_get($doctor->metadata, 'photo_url') ?? data_get($doctor->metadata, 'avatar_url'),
                'specialty' => $specialty,
                'license' => $doctor->professional_license,
                'bio' => data_get($doctor->metadata, 'bio')
                    ?? data_get($doctor->metadata, 'description')
                    ?? 'Atención profesional en '.$specialty.'.',
                'rating' => is_numeric(data_get($doctor->metadata, 'rating')) ? (float) data_get($doctor->metadata, 'rating') : null,
                'reviews' => is_numeric(data_get($doctor->metadata, 'reviews_count')) ? (int) data_get($doctor->metadata, 'reviews_count') : null,
                'experience' => is_numeric(data_get($doctor->metadata, 'years_experience')) ? (int) data_get($doctor->metadata, 'years_experience') : null,
                'unit' => $locationName,
                'address' => $locationAddress,
                'slots' => $scheduling->availableSlots($doctor, $bookingStart, 21, 30, 7),
            ]];
        });
        $scheduledAppointment = null;
        if ($scheduledAppointmentId = $request->session()->get('patient_scheduled_appointment_id')) {
            $scheduledAppointment = Appointment::query()
                ->with(['doctor', 'medicalUnit'])
                ->where('patient_id', $patient->id)
                ->find($scheduledAppointmentId);
        }
        $bookingConfirmation = $scheduledAppointment ? [
            'doctor' => $scheduledAppointment->doctor?->full_name ?? 'Médico por confirmar',
            'specialty' => $scheduledAppointment->specialty ?: 'Consulta médica',
            'date' => ucfirst($scheduledAppointment->starts_at?->copy()->locale('es')->translatedFormat('l j')).' de '.$scheduledAppointment->starts_at?->copy()->locale('es')->translatedFormat('F').' de '.$scheduledAppointment->starts_at?->format('Y'),
            'time' => $scheduledAppointment->starts_at?->format('H:i'),
            'unit' => $scheduledAppointment->medicalUnit?->name ?? $scheduledAppointment->location ?? 'Ubicación por confirmar',
            'location' => data_get($scheduledAppointment->metadata, 'location_address')
                ?? $scheduledAppointment->location
                ?? 'Ubicación por confirmar',
            'reason' => data_get($scheduledAppointment->metadata, 'reason_type') ?? $scheduledAppointment->reason,
            'starts_at' => $scheduledAppointment->starts_at?->toIso8601String(),
            'ends_at' => $scheduledAppointment->ends_at?->toIso8601String(),
        ] : null;

        return view('patient.dashboard', [
            'patient' => $patient,
            'doctors' => $doctors,
            'doctorBookingOptions' => $doctorBookingOptions,
            'bookingConfirmation' => $bookingConfirmation,
            'nextAppointments' => $patient->appointments
                ->sortBy('starts_at')
                ->take(5),
            'recentRecords' => $patient->clinicalRecords
                ->sortByDesc('recorded_at')
                ->take(6),
            'activePrescriptions' => $patient->prescriptions
                ->sortByDesc('issued_at')
                ->take(6),
            'policy' => $patient->insurancePolicies
                ->sortByDesc('created_at')
                ->first(),
            'clinicalAnalyses' => $patient->documents
                ->filter(fn ($document) => in_array($document->document_type, ['clinical_analysis', 'laboratory', 'analysis', 'imaging', 'image', 'pdf', 'clinical_summary'], true))
                ->sortByDesc('loaded_at'),
        ]);
    }

    public function storeRegisterAttachment(Request $request): JsonResponse
    {
        $patient = $this->resolvePatient($request);
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,heic,heif,doc,docx', 'max:10240'],
            'record_id' => ['required', 'string', 'max:32'],
            'profile_id' => ['nullable', 'string', 'max:80'],
            'category' => ['nullable', 'string', 'max:60'],
        ]);
        $file = $request->file('file');
        $path = $file->store("patient-register-attachments/{$patient->id}", 'local');
        abort_if($path === false, 500, 'No se pudo guardar el archivo.');

        try {
            $document = Document::query()->create([
                'patient_id' => $patient->id,
                'name' => $file->getClientOriginalName(),
                'document_type' => 'patient_quick_register',
                'file_path' => $path,
                'file_mime' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'uploaded_by' => $request->user()->id,
                'loaded_at' => now(),
                'metadata' => [
                    'record_id' => $validated['record_id'],
                    'profile_id' => $validated['profile_id'] ?? null,
                    'category' => $validated['category'] ?? null,
                ],
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);
        } catch (Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }

        return response()->json(['document_id' => $document->id], 201);
    }

    public function downloadRegisterAttachment(Request $request, Document $document): StreamedResponse
    {
        $patient = $this->resolvePatient($request);
        abort_unless($document->patient_id === $patient->id && $document->document_type === 'patient_quick_register', 403);
        abort_unless($document->file_path && Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->download($document->file_path, $document->name);
    }

    public function storeAppointment(
        Request $request,
        AppointmentSchedulingService $scheduling,
        PlatformAuditService $audit,
    ): RedirectResponse {
        $patient = $this->resolvePatient($request);
        $validated = $request->validate([
            'doctor_id' => ['required', Rule::exists('doctors', 'id')->where('status', 'active')],
            'starts_at' => ['required', 'date_format:Y-m-d H:i', 'after:now'],
            'reason_type' => ['required', Rule::in([
                'Chequeo general',
                'Hipertensión arterial',
                'Diabetes',
                'Colesterol alto',
                'Enfermedades respiratorias',
                'Dolor de cabeza / Migraña',
                'Otro motivo',
            ])],
            'reason_notes' => ['nullable', 'string', 'max:200'],
        ]);
        $doctor = Doctor::query()
            ->with(['medicalUnit', 'clinics', 'availabilityRules', 'availabilityExceptions', 'appointments'])
            ->where('status', 'active')
            ->findOrFail($validated['doctor_id']);
        $startsAt = Carbon::createFromFormat('Y-m-d H:i', $validated['starts_at']);
        $endsAt = $startsAt->copy()->addMinutes(30);
        $availableStarts = collect($scheduling->availableSlots($doctor, now(), 21, 30, 7))
            ->flatMap(fn (array $date) => collect($date['slots'])->pluck('value'));

        if (! $availableStarts->contains($startsAt->format('Y-m-d H:i'))) {
            throw ValidationException::withMessages([
                'starts_at' => 'El horario seleccionado ya no está disponible. Elige uno nuevo.',
            ]);
        }

        $scheduling->assertAvailable($doctor, $startsAt, $endsAt);
        $clinic = $doctor->clinics->firstWhere('location_type', 'in_person');
        $location = $clinic?->name
            ?? $doctor->medicalUnit?->name
            ?? $doctor->clinics->first()?->name
            ?? 'Consulta privada';
        $locationAddress = $clinic?->address
            ?? $doctor->medicalUnit?->address
            ?? data_get($doctor->medicalUnit?->metadata, 'address')
            ?? $location;
        $appointment = DB::transaction(function () use ($patient, $doctor, $validated, $startsAt, $endsAt, $location, $locationAddress, $request): Appointment {
            $appointment = Appointment::query()->create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'medical_unit_id' => $doctor->medical_unit_id,
                'specialty' => $doctor->specialty ?: 'Medicina general',
                'modality' => 'Presencial',
                'location' => $location,
                'status' => 'scheduled',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'reason' => $validated['reason_type'],
                'metadata' => [
                    'source' => 'patient_portal',
                    'reason_type' => $validated['reason_type'],
                    'reason_notes' => $validated['reason_notes'] ?? null,
                    'duration_minutes' => 30,
                    'location_address' => $locationAddress,
                ],
            ]);

            AppointmentStatusEvent::query()->create([
                'appointment_id' => $appointment->id,
                'changed_by' => $request->user()?->id,
                'from_status' => null,
                'to_status' => 'scheduled',
                'notes' => 'Cita agendada por el paciente.',
                'metadata' => ['source' => 'patient_portal'],
            ]);

            return $appointment;
        });

        $audit->record($request, 'patient.appointment.created', $appointment, 'patient');

        return redirect()->route('patient.dashboard')->with([
            'patient_notice' => 'Cita agendada correctamente.',
            'patient_open_view' => 'doctors',
            'patient_scheduled_appointment_id' => $appointment->id,
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $patient = $this->resolvePatient($request);
        $validated = $request->validate([
            'first_name' => ['nullable', 'string', 'max:120'],
            'last_name' => ['nullable', 'string', 'max:160'],
            'birth_date' => ['nullable', 'date'],
            'sex' => ['nullable', 'in:female,male,other,unspecified'],
            'curp' => ['nullable', 'string', 'max:18', 'unique:patients,curp,'.$patient->id],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $fullName = trim(($validated['first_name'] ?? '').' '.($validated['last_name'] ?? ''));
        $patient->update([
            ...$validated,
            'full_name' => $fullName !== '' ? $fullName : $patient->full_name,
            'profile_completed_at' => now(),
        ]);

        return back()->with('patient_notice', 'Perfil actualizado correctamente.');
    }

    public function saveInsurance(Request $request): RedirectResponse
    {
        $patient = $this->resolvePatient($request);
        $validated = $request->validate([
            'policy_number' => ['required', 'string', 'max:120'],
            'insurer_name' => ['required', 'string', 'max:180'],
            'plan_name' => ['nullable', 'string', 'max:180'],
            'employer_name' => ['nullable', 'string', 'max:180'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['required', 'in:active,inactive,expired,pending'],
        ]);

        InsurancePolicy::query()->updateOrCreate(
            ['patient_id' => $patient->id, 'policy_number' => $validated['policy_number']],
            [...$validated, 'patient_id' => $patient->id],
        );

        return back()->with('patient_notice', 'Póliza guardada correctamente.');
    }

    private function resolvePatient(Request $request): Patient
    {
        $user = $request->user();

        if ($user?->patient) {
            return $user->patient;
        }

        abort_unless(in_array($user?->role, ['superadmin', 'admin'], true), 403);

        return Patient::query()
            ->with('user')
            ->latest()
            ->firstOrFail();
    }
}
