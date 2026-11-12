<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Doctor;
use App\Models\User;
use App\Services\DoctorConsultationTariffService;
use App\Services\Platform\PlatformAuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class DoctorConsultationTariffTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    private function doctor(string $userStatus = 'active', string $doctorStatus = 'active'): array
    {
        $id = (string) Str::uuid();
        $user = User::query()->create([
            'name' => 'Médico de prueba', 'username' => $id, 'email' => $id.'@test.local',
            'role' => 'doctor', 'module' => 'doctor', 'status' => $userStatus,
        ]);
        $doctor = Doctor::query()->create([
            'user_id' => $user->id, 'full_name' => 'Médico de prueba', 'specialty' => 'Medicina general', 'status' => $doctorStatus,
        ]);

        return [$user, $doctor];
    }

    private function publish(User $user, string $amount = '100.25', ?int $expected = null)
    {
        return $this->actingAs($user)->patch(route('doctor.consultation_tariff.update'), [
            'action' => 'publish', 'amount' => $amount, 'expected_tariff_id' => $expected,
        ]);
    }

    public function test_own_doctor_panel_has_no_default_tariff_and_exposes_the_price_form(): void
    {
        [$user, $doctor] = $this->doctor();
        $this->actingAs($user)->get(route('doctor.dashboard', ['section' => 'clinics']))
            ->assertOk()->assertSee('Tarifa de consulta presencial')->assertSee('Importe total por consulta, en MXN.')
            ->assertSee('Sin tarifa publicada')->assertSee('data-consultation-tariff-form', false)
            ->assertSee('value="" placeholder="Escribe tu tarifa"', false);
        $this->assertNull($doctor->fresh()->current_consultation_tariff_id);
        $this->assertDatabaseCount('doctor_consultation_tariffs', 0);
    }

    public function test_active_doctor_publishes_only_their_own_exact_cent_tariff_and_safe_audit(): void
    {
        [$user, $doctor] = $this->doctor();
        [, $other] = $this->doctor();
        $this->publish($user)->assertRedirect(route('doctor.dashboard', ['section' => 'clinics']))->assertSessionHasNoErrors();
        $tariff = $doctor->fresh()->currentConsultationTariff;
        $this->assertSame($doctor->id, $tariff->doctor_id);
        $this->assertSame(10025, $tariff->amount_cents);
        $this->assertSame(1, $tariff->version);
        $this->assertSame('in_person', $tariff->modality);
        $this->assertSame('MXN', $tariff->currency);
        $this->assertSame($user->id, $tariff->created_by);
        $this->assertNull($other->fresh()->current_consultation_tariff_id);
        $audit = AuditLog::query()->where('event', 'doctor.consultation_tariff.publish')->firstOrFail();
        $this->assertSame(['tariff_id', 'version', 'currency', 'amount_cents', 'modality'], array_keys($audit->payload['context']));
        $this->assertSame($tariff->id, $audit->payload['context']['tariff_id']);
        $this->assertDatabaseCount('doctor_consultation_tariffs', 1);
    }

    public function test_new_prices_append_versions_and_preserve_the_previously_published_amount(): void
    {
        [$user, $doctor] = $this->doctor();
        $this->publish($user)->assertSessionHasNoErrors();
        $first = $doctor->fresh()->currentConsultationTariff;
        $this->publish($user, '200.10', $first->id)->assertSessionHasNoErrors();
        $second = $doctor->fresh()->currentConsultationTariff;
        $this->assertNotSame($first->id, $second->id);
        $this->assertSame(2, $second->version);
        $this->assertSame(20010, $second->amount_cents);
        $this->assertSame(10025, $first->fresh()->amount_cents);
        $this->publish($user, '200.10', $second->id)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('doctor_consultation_tariffs', 2);
        $this->assertSame($second->id, $doctor->fresh()->current_consultation_tariff_id);
    }

    public function test_withdrawing_a_price_removes_only_the_pointer_and_republishing_keeps_history(): void
    {
        [$user, $doctor] = $this->doctor();
        $this->publish($user)->assertSessionHasNoErrors();
        $first = $doctor->fresh()->currentConsultationTariff;
        $this->actingAs($user)->patch(route('doctor.consultation_tariff.update'), [
            'action' => 'withdraw', 'expected_tariff_id' => $first->id,
        ])->assertSessionHasNoErrors();
        $this->assertNull($doctor->fresh()->current_consultation_tariff_id);
        $this->assertSame(10025, $first->fresh()->amount_cents);
        $this->assertDatabaseCount('doctor_consultation_tariffs', 1);
        $this->publish($user, '300.00')->assertSessionHasNoErrors();
        $this->assertSame(2, $doctor->fresh()->currentConsultationTariff->version);
        $this->assertDatabaseCount('doctor_consultation_tariffs', 2);
    }

    public function test_stale_forms_cannot_overwrite_or_withdraw_a_newer_tariff(): void
    {
        [$user, $doctor] = $this->doctor();
        $this->publish($user)->assertSessionHasNoErrors();
        $first = $doctor->fresh()->currentConsultationTariff;
        $this->publish($user, '200', $first->id)->assertSessionHasNoErrors();
        $second = $doctor->fresh()->currentConsultationTariff;
        $this->publish($user, '300', $first->id)->assertSessionHasErrors('amount');
        $this->actingAs($user)->patch(route('doctor.consultation_tariff.update'), [
            'action' => 'withdraw', 'expected_tariff_id' => $first->id,
        ])->assertSessionHasErrors('amount');
        $this->assertSame($second->id, $doctor->fresh()->current_consultation_tariff_id);
        $this->assertDatabaseCount('doctor_consultation_tariffs', 2);
    }

    public function test_client_cannot_choose_another_doctor_or_supply_price_version_currency_or_mode(): void
    {
        [$user, $doctor] = $this->doctor();
        [, $other] = $this->doctor();
        foreach (['doctor_id' => $other->id, 'version' => 12, 'currency' => 'USD', 'mode' => 'live', 'amount_cents' => 1] as $key => $value) {
            $this->actingAs($user)->patch(route('doctor.consultation_tariff.update'), [
                'action' => 'publish', 'amount' => '100.00', 'expected_tariff_id' => null, $key => $value,
            ])->assertUnprocessable();
        }
        $this->assertNull($doctor->fresh()->current_consultation_tariff_id);
        $this->assertNull($other->fresh()->current_consultation_tariff_id);
        $this->assertDatabaseCount('doctor_consultation_tariffs', 0);
    }

    public function test_admins_patients_inactive_users_and_missing_or_inactive_doctor_profiles_cannot_publish(): void
    {
        foreach (['admin', 'superadmin', 'patient'] as $role) {
            [$user] = $this->doctor();
            $user->update(['role' => $role]);
            $this->publish($user)->assertForbidden();
        }
        [$inactiveUser] = $this->doctor('inactive');
        $this->publish($inactiveUser)->assertForbidden();
        [$inactiveDoctor] = $this->doctor('active', 'inactive');
        $this->publish($inactiveDoctor)->assertForbidden();
        $missing = User::query()->create(['name' => 'Sin perfil', 'username' => (string) Str::uuid(), 'role' => 'doctor', 'status' => 'active']);
        $this->publish($missing)->assertForbidden();
        $this->assertDatabaseCount('doctor_consultation_tariffs', 0);
    }

    public function test_amount_parser_accepts_exact_cents_at_the_bounds_and_rejects_ambiguous_values(): void
    {
        $service = app(DoctorConsultationTariffService::class);
        foreach (['50' => 5000, '50.01' => 5001, '50,10' => 5010, '10000' => 1000000, ' 200.00 ' => 20000] as $amount => $expected) {
            $this->assertSame($expected, $service->parseAmount((string) $amount));
        }
        foreach (['49.99', '10000.01', '1e3', '-50', '+50', '50.001', '1,000.00', 'Infinity', 'NaN', '', '999999999999999999999999'] as $amount) {
            try {
                $service->parseAmount($amount);
                $this->fail('An invalid tariff was accepted.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('amount', $exception->errors());
            }
        }
    }

    public function test_published_rows_cannot_be_changed_or_deleted_through_the_model(): void
    {
        [$user, $doctor] = $this->doctor();
        $this->publish($user)->assertSessionHasNoErrors();
        $tariff = $doctor->fresh()->currentConsultationTariff;
        try {
            $tariff->update(['amount_cents' => 99999]);
            $this->fail('A published tariff was modified.');
        } catch (LogicException) {
            $this->assertSame(10025, $tariff->fresh()->amount_cents);
        }
        try {
            $tariff->fresh()->delete();
            $this->fail('A published tariff was deleted.');
        } catch (LogicException) {
            $this->assertDatabaseCount('doctor_consultation_tariffs', 1);
        }
    }

    public function test_audit_failure_rolls_back_both_publication_and_current_pointer(): void
    {
        [$user, $doctor] = $this->doctor();
        $this->mock(PlatformAuditService::class)->shouldReceive('record')->once()->andThrow(new RuntimeException('Synthetic audit failure.'));
        $this->withoutExceptionHandling();
        try {
            $this->publish($user);
            $this->fail('The synthetic audit failure must propagate.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Synthetic audit failure.', $exception->getMessage());
        }
        $this->assertNull($doctor->fresh()->current_consultation_tariff_id);
        $this->assertDatabaseCount('doctor_consultation_tariffs', 0);
    }
}
