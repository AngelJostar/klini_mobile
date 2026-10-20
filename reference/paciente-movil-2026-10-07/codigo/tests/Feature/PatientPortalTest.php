<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Document;
use App\Models\MedicalUnit;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PatientPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_user_can_open_native_blade_portal(): void
    {
        [$user] = $this->makePatient();

        $this->actingAs($user)
            ->get(route('patient.dashboard'))
            ->assertOk()
            ->assertSee('Portal del Paciente')
            ->assertSee('patient-assistant-native-screen')
            ->assertSee('patient-assistant-native-menu')
            ->assertSee('class="patient-portal-menu-title">Soporte</strong>', false)
            ->assertSee('data-support-toggle', false)
            ->assertSee('aria-hidden="true"', false)
            ->assertDontSee('data-open-view="history"', false)
            ->assertSee('data-patient-home-posts-root', false)
            ->assertSee('data-patient-social', false)
            ->assertSee('js/patient-social.js', false)
            ->assertSee('css/patient-social.css', false)
            ->assertSee("startView: 'posts'", false)
            ->assertDontSee('¿Cómo amaneciste hoy?')
            ->assertSee('data-ai-top-input', false)
            ->assertSee('Mi Seguro')
            ->assertSee('Resumen de información')
            ->assertSee('Aseguradora no registrada')
            ->assertSee('data-insurance-tab="summary"', false)
            ->assertSee('data-insurance-form', false)
            ->assertSee('data-history-filter="consultation"', false)
            ->assertSee('Receta / Indicaciones')
            ->assertSee('data-patient-view="prescriptions"', false)
            ->assertSee('Médicos y terapeutas')
            ->assertSee('data-calendar-filter="upcoming"', false)
            ->assertSee('Historial de consultas')
            ->assertSee('Dispositivos')
            ->assertSee('Registro')
            ->assertDontSee('>Comprar<', false)
            ->assertDontSee('Farmacia Digital')
            ->assertSee('Paciente Acciones')
            ->assertDontSee('<iframe');
    }

    public function test_imported_patient_styles_do_not_replace_other_modules_styles(): void
    {
        [$user] = $this->makePatient();
        $this->actingAs($user)->get(route('patient.dashboard'))->assertOk()
            ->assertSee('css/patient-portal-source.css', false)
            ->assertSee('js/patient-portal-table-filters.js', false)
            ->assertSee('css/communities.css', false)
            ->assertDontSee('css/klini-system.css', false)
            ->assertDontSee('css/klini-carousels.css', false)
            ->assertDontSee('js/klini-patient-workspace.js', false);

        $user->update(['role' => 'superadmin', 'module' => 'superadmin']);
        $this->get(route('superadmin.dashboard'))->assertOk()
            ->assertSee('css/drsam.css', false)
            ->assertSee('css/klini-system.css', false)
            ->assertSee('css/klini-carousels.css', false)
            ->assertDontSee('css/patient-portal-source.css', false)
            ->assertDontSee('js/patient-portal-table-filters.js', false);
    }

    public function test_patient_can_reach_community_panel_from_menu_or_direct_link(): void
    {
        [$user] = $this->makePatient();
        $response = $this->actingAs($user)->get(route('patient.dashboard'))->assertOk()
            ->assertSee('class="patient-bottom-communities"', false)
            ->assertSee('data-patient-view="communities"', false)
            ->assertSee("window.location.hash === '#communities'", false);
        $this->assertSame(2, substr_count($response->getContent(), 'data-open-view="communities"'));
    }

    public function test_my_health_includes_the_clinical_history_switch_and_shared_history(): void
    {
        [$user] = $this->makePatient();

        $response = $this->actingAs($user)
            ->get(route('patient.dashboard'))
            ->assertOk()
            ->assertSee('data-health-view-switch', false)
            ->assertSee('data-health-view-mode="parameters"', false)
            ->assertSee('data-health-view-mode="history"', false)
            ->assertSee('data-health-view-stage', false)
            ->assertSee('data-health-view-panel="parameters"', false)
            ->assertSee('data-health-view-panel="history"', false)
            ->assertSee('data-history-view="favorites"', false)
            ->assertSee('data-history-view="all"', false);

        $this->assertSame(2, substr_count($response->getContent(), 'class="patient-history-body" data-clinical-history'));
        $this->assertSame(2, substr_count($response->getContent(), 'data-history-view-switch'));
    }

    public function test_quick_register_has_parameter_and_clinical_history_tabs(): void
    {
        [$user] = $this->makePatient();

        $response = $this->actingAs($user)
            ->get(route('patient.dashboard'))
            ->assertOk()
            ->assertSee('data-register-view-switch', false)
            ->assertSee('data-register-view-mode="parameters"', false)
            ->assertSee('data-register-view-mode="history"', false)
            ->assertSee('data-register-view-panel="parameters"', false)
            ->assertSee('data-register-view-panel="history"', false)
            ->assertSee('data-register-filter-switch', false)
            ->assertSee('data-register-filter-view="favorites"', false)
            ->assertSee('data-register-filter-view="all"', false)
            ->assertSee('data-register-history-carousel', false)
            ->assertSee('data-register-history-card="consultation"', false)
            ->assertSee('data-register-history-favorite="consultation"', false)
            ->assertSee('<header class="patient-register-selected-metric">', false)
            ->assertSee('class="patient-register-selected-icon patient-register-history-composer-icon"', false)
            ->assertSee('data-register-history-empty', false)
            ->assertSee('data-register-history-file-pick', false)
            ->assertSee('data-register-history-file-input', false)
            ->assertSee('data-register-file-pick', false)
            ->assertSee('data-register-file-input', false);

        $this->assertSame(2, substr_count($response->getContent(), '<span>Adjuntar archivo</span>'));
    }

    public function test_patient_can_upload_and_download_a_quick_register_attachment(): void
    {
        Storage::fake('local');
        [$user, $patient] = $this->makePatient();

        $response = $this->actingAs($user)->postJson(route('patient.register_attachments.store'), [
            'file' => UploadedFile::fake()->create('informe.pdf', 100, 'application/pdf'),
            'record_id' => 'quick-123',
            'profile_id' => 'primary',
            'category' => 'laboratory',
        ])->assertCreated()->assertJsonStructure(['document_id']);

        $document = Document::query()->findOrFail($response->json('document_id'));
        $this->assertSame($patient->id, $document->patient_id);
        $this->assertSame('patient_quick_register', $document->document_type);
        $this->assertSame('informe.pdf', $document->name);
        $this->assertSame('quick-123', $document->metadata['record_id']);
        Storage::disk('local')->assertExists($document->file_path);

        $download = $this->get(route('patient.register_attachments.download', $document))->assertOk();
        $this->assertStringContainsString('informe.pdf', $download->headers->get('content-disposition'));
    }

    public function test_quick_register_attachment_rejects_invalid_files_and_other_patients(): void
    {
        Storage::fake('local');
        [$user] = $this->makePatient();

        $this->actingAs($user)->postJson(route('patient.register_attachments.store'), [
            'file' => UploadedFile::fake()->create('notas.txt', 10, 'text/plain'),
            'record_id' => 'quick-124',
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('documents', 0);

        $documentId = $this->postJson(route('patient.register_attachments.store'), [
            'file' => UploadedFile::fake()->image('resultado.png'),
            'record_id' => 'quick-125',
        ])->assertCreated()->json('document_id');

        $otherUser = User::query()->create([
            'name' => 'Otro Paciente',
            'username' => 'otro.paciente',
            'email' => 'otro.paciente@test.local',
            'role' => 'patient',
            'module' => 'patient',
            'status' => 'active',
        ]);
        Patient::query()->create([
            'user_id' => $otherUser->id,
            'platform_number' => 'PAC-ACTIONS-002',
            'full_name' => 'Otro Paciente',
            'status' => 'active',
        ]);

        $this->actingAs($otherUser)
            ->get(route('patient.register_attachments.download', $documentId))
            ->assertForbidden();
    }

    public function test_patient_can_update_own_profile(): void
    {
        [$user, $patient] = $this->makePatient();

        $this->actingAs($user)
            ->patch(route('patient.profile.update'), [
                'first_name' => 'Claudia',
                'last_name' => 'Salinas Vega',
                'birth_date' => '1988-07-20',
                'sex' => 'female',
                'curp' => 'SAVC880720MDFXXX01',
                'phone' => '5555550101',
                'email' => 'claudia@example.test',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'full_name' => 'Claudia Salinas Vega',
            'phone' => '5555550101',
        ]);
    }

    public function test_calendar_orders_scheduled_appointments_before_past_appointments(): void
    {
        Carbon::setTestNow('2026-08-17 12:00:00');

        try {
            [$user, $patient] = $this->makePatient();
            $appointments = [
                ['reason' => 'Futura lejana de control', 'starts_at' => now()->addDays(20), 'status' => 'scheduled'],
                ['reason' => 'Pasada antigua de control', 'starts_at' => now()->subDays(12), 'status' => 'completed'],
                ['reason' => 'Futura próxima de control', 'starts_at' => now()->addDays(2), 'status' => 'scheduled'],
                ['reason' => 'Pasada reciente de control', 'starts_at' => now()->subDay(), 'status' => 'completed'],
            ];

            foreach ($appointments as $appointment) {
                Appointment::query()->create([
                    'patient_id' => $patient->id,
                    'specialty' => 'Medicina interna',
                    ...$appointment,
                ]);
            }

            $response = $this->actingAs($user)->get(route('patient.dashboard'))->assertOk();
            $html = $response->getContent();
            $calendarStart = strpos($html, 'data-patient-view="calendar"');
            $calendarEnd = strpos($html, 'data-patient-view="doctors"', $calendarStart);

            $this->assertNotFalse($calendarStart);
            $this->assertNotFalse($calendarEnd);
            $calendarHtml = substr($html, $calendarStart, $calendarEnd - $calendarStart);
            $expectedOrder = [
                'Futura próxima de control',
                'Futura lejana de control',
                'Pasada reciente de control',
                'Pasada antigua de control',
            ];
            $positions = array_map(fn ($text) => strpos($calendarHtml, $text), $expectedOrder);

            foreach ($positions as $position) {
                $this->assertNotFalse($position);
            }
            for ($index = 0; $index < count($positions) - 1; $index++) {
                $this->assertTrue($positions[$index] < $positions[$index + 1]);
            }
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_patient_can_register_insurance_policy(): void
    {
        [$user, $patient] = $this->makePatient();

        $this->actingAs($user)
            ->post(route('patient.insurance.save'), [
                'policy_number' => 'POL-2026-001',
                'insurer_name' => 'Aseguradora Demo',
                'plan_name' => 'Plan Integral',
                'starts_at' => '2026-01-01',
                'ends_at' => '2026-12-31',
                'status' => 'active',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('insurance_policies', [
            'patient_id' => $patient->id,
            'policy_number' => 'POL-2026-001',
            'insurer_name' => 'Aseguradora Demo',
        ]);
    }

    public function test_patient_can_schedule_an_available_doctor_appointment(): void
    {
        Carbon::setTestNow('2026-08-17 08:00:00');

        try {
            [$user, $patient] = $this->makePatient();
            $unit = MedicalUnit::query()->create([
                'name' => 'Hospital de Prueba',
                'city' => 'Ciudad de México',
                'address' => 'Consultorio 12',
                'status' => 'active',
            ]);
            $doctor = Doctor::query()->create([
                'medical_unit_id' => $unit->id,
                'full_name' => 'Dra. Elena Prueba',
                'professional_license' => 'CED-TEST-001',
                'specialty' => 'Medicina interna',
                'status' => 'active',
            ]);

            $response = $this->actingAs($user)->post(route('patient.appointments.store'), [
                'doctor_id' => $doctor->id,
                'starts_at' => '2026-08-17 09:00',
                'reason_type' => 'Chequeo general',
                'reason_notes' => 'Consulta preventiva anual.',
            ]);

            $response->assertRedirect(route('patient.dashboard'))
                ->assertSessionHas('patient_open_view', 'doctors')
                ->assertSessionHas('patient_scheduled_appointment_id');
            $this->assertDatabaseHas('appointments', [
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'medical_unit_id' => $unit->id,
                'status' => 'scheduled',
                'reason' => 'Chequeo general',
                'location' => 'Hospital de Prueba',
            ]);
            $appointment = Appointment::query()->firstOrFail();
            $this->assertSame('2026-08-17 09:00', $appointment->starts_at?->format('Y-m-d H:i'));
            $this->assertDatabaseHas('appointment_status_events', [
                'appointment_id' => $appointment->id,
                'to_status' => 'scheduled',
                'notes' => 'Cita agendada por el paciente.',
            ]);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_redesigned_calendar_exposes_only_the_authenticated_patients_appointments(): void
    {
        [$user, $patient] = $this->makePatient();
        $otherPatient = Patient::query()->create(['full_name' => 'Otro paciente', 'status' => 'active']);
        $ownAppointment = Appointment::query()->create([
            'patient_id' => $patient->id, 'starts_at' => now()->addDay()->setTime(7, 15),
            'ends_at' => now()->addDay()->setTime(8, 0), 'status' => 'scheduled',
            'specialty' => 'Medicina general', 'location' => 'Sede de prueba', 'reason' => 'Control autorizado',
        ]);
        Appointment::query()->create([
            'patient_id' => $otherPatient->id, 'starts_at' => now()->addDay(),
            'status' => 'scheduled', 'reason' => 'Motivo privado de otro paciente',
        ]);

        $response = $this->actingAs($user)->get(route('patient.dashboard', ['view' => 'calendar']))->assertOk();
        $response->assertSee('data-calendar-item', false)
            ->assertSee('data-open-view="communities"', false)
            ->assertSee('Control autorizado')
            ->assertSee('07:15')
            ->assertSee('Programada')
            ->assertSee('Sede de prueba')
            ->assertDontSee('Motivo privado de otro paciente');
        $appointments = $response->viewData('patient')->appointments;
        $this->assertCount(1, $appointments);
        $this->assertSame($ownAppointment->id, $appointments->first()->id);
    }

    public function test_redesigned_calendar_does_not_invent_appointments_for_empty_accounts(): void
    {
        [$user] = $this->makePatient();
        $response = $this->actingAs($user)->get(route('patient.dashboard'))->assertOk();
        $response->assertSee('No hay citas o estudios programados.')
            ->assertDontSee('<article class="patient-calendar-card"', false);
        $this->assertCount(0, $response->viewData('patient')->appointments);
    }

    public function test_calendar_periods_keep_ongoing_and_undated_visits_upcoming_and_archive_finished_visits(): void
    {
        [$user, $patient] = $this->makePatient();
        $this->travelTo(Carbon::parse('2026-10-07 12:00:00'));

        foreach ([
            ['En curso', now()->subMinutes(15), now()->addMinutes(15), 'scheduled', 'Presencial'],
            ['Fecha pendiente', null, null, 'scheduled', 'Presencial'],
            ['Ya atendida', now()->subDay(), now()->subDay()->addMinutes(30), 'completed', 'Presencial'],
            ['Cancelada futura', now()->addDay(), null, 'cancelled', 'Presencial'],
            ['Consulta virtual', now()->addDay(), null, 'scheduled', 'Video llamada'],
        ] as [$title, $startsAt, $endsAt, $status, $modality]) {
            Appointment::query()->create([
                'patient_id' => $patient->id, 'specialty' => $title, 'starts_at' => $startsAt,
                'ends_at' => $endsAt, 'status' => $status, 'modality' => $modality,
                'location' => 'Clínica de prueba',
            ]);
        }

        $html = $this->actingAs($user)->get(route('patient.dashboard'))->assertOk()->getContent();
        preg_match_all('/<article class="patient-calendar-card"[^>]*>.*?<\/article>/s', $html, $matches);
        $cards = collect($matches[0]);
        $this->assertCount(5, $cards);
        foreach (['En curso', 'Fecha pendiente', 'Consulta virtual'] as $title) {
            $card = $cards->first(fn ($markup) => str_contains($markup, '>'.$title.'</h2>'));
            $this->assertStringContainsString('data-calendar-upcoming="1"', $card);
            $this->assertDoesNotMatchRegularExpression('/^<article[^>]*\bhidden\b/', $card);
        }
        foreach (['Ya atendida', 'Cancelada futura'] as $title) {
            $card = $cards->first(fn ($markup) => str_contains($markup, '>'.$title.'</h2>'));
            $this->assertStringContainsString('data-calendar-upcoming="0"', $card);
            $this->assertMatchesRegularExpression('/^<article[^>]*\bhidden\b/', $card);
        }
        $this->assertStringContainsString('Cómo llegar', $cards->first(fn ($markup) => str_contains($markup, '>En curso</h2>')));
        $this->assertStringNotContainsString('Cómo llegar', $cards->first(fn ($markup) => str_contains($markup, '>Consulta virtual</h2>')));
        $this->travelBack();
    }

    private function makePatient(): array
    {
        $user = User::query()->create([
            'name' => 'Paciente Acciones',
            'username' => 'paciente.acciones',
            'email' => 'paciente.acciones@test.local',
            'role' => 'patient',
            'module' => 'patient',
            'status' => 'active',
        ]);

        $patient = Patient::query()->create([
            'user_id' => $user->id,
            'platform_number' => 'PAC-ACTIONS-001',
            'full_name' => 'Paciente Acciones',
            'status' => 'active',
        ]);

        return [$user, $patient];
    }
}
