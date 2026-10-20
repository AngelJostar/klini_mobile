<?php

namespace App\Http\Controllers\Api\Mobile\V1;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Patient;
use App\Services\Platform\PlatformAuditService;
use App\Support\MobileApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PatientReadController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $patient = $this->patient($request);
        $now = now();

        return MobileApiResponse::success([
            'summary' => [
                'upcoming_appointments' => $patient->appointments()->where('starts_at', '>=', $now)->whereNotIn('status', ['cancelled', 'completed'])->count(),
                'active_prescriptions' => $patient->prescriptions()->where('status', 'active')->count(),
                'clinical_records' => $patient->clinicalRecords()->count(),
                'documents' => $patient->documents()->count(),
            ],
            'next_appointment' => $this->appointmentData(
                $patient->appointments()
                    ->with(['doctor:id,full_name,specialty', 'medicalUnit:id,name,address'])
                    ->where('starts_at', '>=', $now)
                    ->whereNotIn('status', ['cancelled', 'completed'])
                    ->oldest('starts_at')
                    ->first()
            ),
            'notices' => $this->patientNotices($patient),
        ]);
    }

    public function profile(Request $request, PlatformAuditService $audit): JsonResponse
    {
        $patient = $this->patient($request);
        $audit->record($request, 'mobile.patient.profile.viewed', $patient, 'patient');

        return MobileApiResponse::success(['patient' => [
            'id' => $patient->id,
            'platform_number' => $patient->platform_number,
            'first_name' => $patient->first_name,
            'last_name' => $patient->last_name,
            'full_name' => $patient->full_name,
            'birth_date' => $patient->birth_date?->toDateString(),
            'sex' => $patient->sex,
            'curp' => $patient->curp,
            'phone' => $patient->phone,
            'email' => $patient->email,
            'status' => $patient->status,
        ]]);
    }

    public function updateProfile(Request $request, PlatformAuditService $audit): JsonResponse
    {
        $patient = $this->patient($request);
        $user = $request->user();
        $validated = $request->validate([
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => [
                'nullable',
                'email:rfc',
                'max:255',
                Rule::unique('patients', 'email')->ignore($patient->id),
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        DB::transaction(function () use ($patient, $user, $validated): void {
            $patient->update($validated);
            if (array_key_exists('email', $validated)) {
                $user->update(['email' => $validated['email']]);
            }
        });
        $audit->record($request, 'mobile.patient.profile.updated', $patient, 'patient', ['fields' => array_keys($validated)]);

        return $this->profile($request, $audit);
    }

    public function appointments(Request $request): JsonResponse
    {
        $paginator = $this->patient($request)->appointments()
            ->with(['doctor:id,full_name,specialty', 'medicalUnit:id,name,address'])
            ->latest('starts_at')
            ->paginate($this->perPage($request));

        return $this->paginated($paginator, fn ($appointment): array => $this->appointmentData($appointment));
    }

    public function appointment(Request $request, int $appointment): JsonResponse
    {
        $item = $this->patient($request)->appointments()
            ->with(['doctor:id,full_name,specialty', 'medicalUnit:id,name,address'])
            ->findOrFail($appointment);

        return MobileApiResponse::success(['appointment' => $this->appointmentData($item)]);
    }

    public function clinicalRecords(Request $request, PlatformAuditService $audit): JsonResponse
    {
        $patient = $this->patient($request);
        $paginator = $patient->clinicalRecords()
            ->with('doctor:id,full_name,specialty')
            ->latest('recorded_at')
            ->paginate($this->perPage($request));
        $audit->record($request, 'mobile.patient.clinical_records.viewed', $patient, 'patient');

        return $this->paginated($paginator, fn ($record): array => [
            'id' => $record->id,
            'type' => $record->record_type,
            'title' => $record->title,
            'summary' => $record->summary,
            'recorded_at' => $record->recorded_at?->toIso8601String(),
            'doctor' => $record->doctor ? [
                'id' => $record->doctor->id,
                'name' => $record->doctor->full_name,
                'specialty' => $record->doctor->specialty,
            ] : null,
        ]);
    }

    public function prescriptions(Request $request, PlatformAuditService $audit): JsonResponse
    {
        $patient = $this->patient($request);
        $paginator = $patient->prescriptions()
            ->with(['doctor:id,full_name,specialty', 'items'])
            ->latest('issued_at')
            ->paginate($this->perPage($request));
        $audit->record($request, 'mobile.patient.prescriptions.viewed', $patient, 'patient');

        return $this->paginated($paginator, fn ($prescription): array => [
            'id' => $prescription->id,
            'code' => $prescription->code,
            'status' => $prescription->status,
            'issued_at' => $prescription->issued_at?->toIso8601String(),
            'notes' => $prescription->notes,
            'doctor' => $prescription->doctor ? [
                'id' => $prescription->doctor->id,
                'name' => $prescription->doctor->full_name,
                'specialty' => $prescription->doctor->specialty,
            ] : null,
            'items' => $prescription->items->map(fn ($item): array => [
                'id' => $item->id,
                'medication_name' => $item->medication_name,
                'dose' => $item->dose,
                'frequency' => $item->frequency,
                'duration' => $item->duration,
                'instructions' => $item->instructions,
            ])->values(),
        ]);
    }

    public function documents(Request $request, PlatformAuditService $audit): JsonResponse
    {
        $patient = $this->patient($request);
        $paginator = $patient->documents()
            ->latest('loaded_at')
            ->paginate($this->perPage($request));
        $audit->record($request, 'mobile.patient.documents.viewed', $patient, 'patient');

        return $this->paginated($paginator, fn (Document $document): array => [
            'id' => $document->id,
            'name' => $document->name,
            'type' => $document->document_type,
            'mime_type' => $document->file_mime,
            'size' => $document->file_size,
            'status' => $document->status,
            'loaded_at' => $document->loaded_at?->toIso8601String(),
            'expires_at' => $document->expires_at?->toDateString(),
            'download_url' => route('api.mobile.v1.patient.documents.download', $document),
        ]);
    }

    public function downloadDocument(Request $request, int $document, PlatformAuditService $audit): StreamedResponse
    {
        $patient = $this->patient($request);
        $file = $patient->documents()->findOrFail($document);

        abort_unless($file->file_path && Storage::disk('local')->exists($file->file_path), 404);
        $audit->record($request, 'mobile.patient.document.downloaded', $file, 'patient');

        return Storage::disk('local')->download($file->file_path, $file->name);
    }

    private function patient(Request $request): Patient
    {
        return $request->user()->patient()->firstOrFail();
    }

    private function perPage(Request $request): int
    {
        return min(max($request->integer('per_page', 15), 1), 50);
    }

    private function appointmentData($appointment): ?array
    {
        if (! $appointment) {
            return null;
        }

        return [
            'id' => $appointment->id,
            'status' => $appointment->status,
            'specialty' => $appointment->specialty,
            'modality' => $appointment->modality,
            'location' => $appointment->location,
            'starts_at' => $appointment->starts_at?->toIso8601String(),
            'ends_at' => $appointment->ends_at?->toIso8601String(),
            'reason' => $appointment->reason,
            'doctor' => $appointment->doctor ? [
                'id' => $appointment->doctor->id,
                'name' => $appointment->doctor->full_name,
                'specialty' => $appointment->doctor->specialty,
            ] : null,
            'medical_unit' => $appointment->medicalUnit ? [
                'id' => $appointment->medicalUnit->id,
                'name' => $appointment->medicalUnit->name,
                'address' => $appointment->medicalUnit->address,
            ] : null,
        ];
    }

    private function patientNotices(Patient $patient): array
    {
        $notices = [];
        $nextAppointment = $patient->appointments()->where('starts_at', '>=', now())->whereNotIn('status', ['cancelled', 'completed'])->oldest('starts_at')->first();
        if ($nextAppointment) {
            $notices[] = [
                'id' => 'appointment-'.$nextAppointment->id,
                'type' => 'appointment',
                'title' => 'Próxima cita',
                'message' => 'Tienes una cita programada próximamente.',
                'occurred_at' => $nextAppointment->starts_at?->toIso8601String(),
            ];
        }

        $latestPrescription = $patient->prescriptions()->where('status', 'active')->latest('issued_at')->first();
        if ($latestPrescription) {
            $notices[] = [
                'id' => 'prescription-'.$latestPrescription->id,
                'type' => 'prescription',
                'title' => 'Receta activa',
                'message' => 'Consulta las indicaciones de tu receta '.$latestPrescription->code.'.',
                'occurred_at' => $latestPrescription->issued_at?->toIso8601String(),
            ];
        }

        $latestDocument = $patient->documents()->latest('loaded_at')->first();
        if ($latestDocument) {
            $notices[] = [
                'id' => 'document-'.$latestDocument->id,
                'type' => 'document',
                'title' => 'Documento disponible',
                'message' => $latestDocument->name.' ya está disponible en tus documentos.',
                'occurred_at' => $latestDocument->loaded_at?->toIso8601String(),
            ];
        }

        return $notices;
    }

    private function paginated(LengthAwarePaginator $paginator, callable $transform): JsonResponse
    {
        return MobileApiResponse::success([
            'items' => $paginator->getCollection()->map($transform)->values(),
        ], meta: [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
