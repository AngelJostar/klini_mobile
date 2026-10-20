<?php

namespace Tests\Feature\Api\Mobile;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\ClinicalRecord;
use App\Models\Doctor;
use App\Models\Document;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PatientReadApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_reads_only_their_paginated_clinical_resources(): void
    {
        [$user, $patient] = $this->patientAccount('patient-owner');
        [, $otherPatient] = $this->patientAccount('patient-other');
        $doctor = Doctor::query()->create(['full_name' => 'Dra. API', 'specialty' => 'Medicina interna']);

        Appointment::query()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'starts_at' => now()->addDay(),
        ]);
        Appointment::query()->create([
            'patient_id' => $otherPatient->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'starts_at' => now()->addDay(),
        ]);
        ClinicalRecord::query()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'record_type' => 'consultation',
            'title' => 'Consulta propia',
            'recorded_at' => now(),
        ]);
        ClinicalRecord::query()->create([
            'patient_id' => $otherPatient->id,
            'record_type' => 'consultation',
            'title' => 'Consulta ajena',
            'recorded_at' => now(),
        ]);
        $prescription = Prescription::query()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'code' => 'RX-MOBILE-001',
            'status' => 'active',
            'issued_at' => now(),
        ]);
        PrescriptionItem::query()->create([
            'prescription_id' => $prescription->id,
            'medication_name' => 'Paracetamol',
            'dose' => '500 mg',
            'frequency' => 'Cada 8 horas',
        ]);

        $token = $this->mobileToken($user);

        $this->withToken($token)->getJson('/api/mobile/v1/patient/profile')
            ->assertOk()
            ->assertJsonPath('data.patient.id', $patient->id)
            ->assertJsonMissingPath('data.patient.metadata');

        $this->withToken($token)->getJson('/api/mobile/v1/patient/appointments?per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('meta.pagination.total', 1)
            ->assertJsonPath('data.items.0.doctor.name', 'Dra. API');

        $this->withToken($token)->getJson('/api/mobile/v1/patient/clinical-records')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.title', 'Consulta propia')
            ->assertJsonMissing(['title' => 'Consulta ajena']);

        $this->withToken($token)->getJson('/api/mobile/v1/patient/prescriptions')
            ->assertOk()
            ->assertJsonPath('data.items.0.code', 'RX-MOBILE-001')
            ->assertJsonPath('data.items.0.items.0.medication_name', 'Paracetamol');

        $this->assertTrue(AuditLog::query()->where('user_id', $user->id)->where('event', 'mobile.patient.profile.viewed')->exists());
        $this->assertTrue(AuditLog::query()->where('user_id', $user->id)->where('event', 'mobile.patient.clinical_records.viewed')->exists());
    }

    public function test_patient_document_download_is_private_and_scoped_to_owner(): void
    {
        Storage::fake('local');
        [$user, $patient] = $this->patientAccount('patient-documents');
        [, $otherPatient] = $this->patientAccount('patient-documents-other');
        Storage::disk('local')->put('mobile/patient-report.pdf', 'own-content');
        Storage::disk('local')->put('mobile/foreign-report.pdf', 'foreign-content');

        $document = Document::query()->create([
            'patient_id' => $patient->id,
            'name' => 'resultado.pdf',
            'document_type' => 'laboratory',
            'file_path' => 'mobile/patient-report.pdf',
            'file_mime' => 'application/pdf',
            'file_size' => 11,
            'loaded_at' => now(),
            'status' => 'current',
        ]);
        $foreignDocument = Document::query()->create([
            'patient_id' => $otherPatient->id,
            'name' => 'ajeno.pdf',
            'document_type' => 'laboratory',
            'file_path' => 'mobile/foreign-report.pdf',
            'status' => 'current',
        ]);

        $token = $this->mobileToken($user);

        $this->withToken($token)->getJson('/api/mobile/v1/patient/documents')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.id', $document->id);

        $this->withToken($token)->get('/api/mobile/v1/patient/documents/'.$document->id.'/download')
            ->assertOk()
            ->assertDownload('resultado.pdf');

        $this->withToken($token)->getJson('/api/mobile/v1/patient/documents/'.$foreignDocument->id.'/download')
            ->assertNotFound()
            ->assertJsonPath('error.code', 'not_found');
    }

    public function test_doctor_cannot_open_patient_role_endpoints(): void
    {
        $doctorUser = User::query()->create([
            'name' => 'Doctor API',
            'username' => 'doctor-patient-endpoint',
            'password' => Hash::make('password'),
            'role' => 'doctor',
            'module' => 'doctor',
            'status' => 'active',
        ]);

        $this->withToken($this->mobileToken($doctorUser, 'doctor'))
            ->getJson('/api/mobile/v1/patient/profile')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'role_not_allowed');
    }

    public function test_patient_dashboard_profile_update_and_appointment_detail_are_scoped(): void
    {
        [$user, $patient] = $this->patientAccount('patient-dashboard');
        [, $otherPatient] = $this->patientAccount('patient-dashboard-other');
        $doctor = Doctor::query()->create(['full_name' => 'Dra. Agenda', 'specialty' => 'Oncología']);
        $appointment = Appointment::query()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'specialty' => 'Oncología',
            'starts_at' => now()->addDay(),
        ]);
        $foreignAppointment = Appointment::query()->create([
            'patient_id' => $otherPatient->id,
            'status' => 'scheduled',
            'starts_at' => now()->addDay(),
        ]);
        $token = $this->mobileToken($user);

        $this->withToken($token)->getJson('/api/mobile/v1/patient/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.upcoming_appointments', 1)
            ->assertJsonPath('data.next_appointment.id', $appointment->id)
            ->assertJsonPath('data.notices.0.type', 'appointment');

        $this->withToken($token)->getJson('/api/mobile/v1/patient/appointments/'.$appointment->id)
            ->assertOk()
            ->assertJsonPath('data.appointment.doctor.name', 'Dra. Agenda');

        $this->withToken($token)->getJson('/api/mobile/v1/patient/appointments/'.$foreignAppointment->id)
            ->assertNotFound();

        $this->withToken($token)->patchJson('/api/mobile/v1/patient/profile', [
            'phone' => '5512345678',
            'email' => 'updated-patient@test.local',
        ])->assertOk()
            ->assertJsonPath('data.patient.phone', '5512345678')
            ->assertJsonPath('data.patient.email', 'updated-patient@test.local');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'updated-patient@test.local']);
        $this->assertTrue(AuditLog::query()->where('user_id', $user->id)->where('event', 'mobile.patient.profile.updated')->exists());
    }

    private function patientAccount(string $username): array
    {
        $user = User::query()->create([
            'name' => 'Paciente API',
            'username' => $username,
            'email' => $username.'@test.local',
            'password' => Hash::make('password'),
            'role' => 'patient',
            'module' => 'patient',
            'status' => 'active',
        ]);
        $patient = Patient::query()->create([
            'user_id' => $user->id,
            'full_name' => 'Paciente API '.$username,
            'status' => 'active',
        ]);

        return [$user, $patient];
    }

    private function mobileToken(User $user, string $role = 'patient'): string
    {
        return $user->createToken('Pixel', ['mobile:access', "role:{$role}"], now()->addDay())->plainTextToken;
    }
}
