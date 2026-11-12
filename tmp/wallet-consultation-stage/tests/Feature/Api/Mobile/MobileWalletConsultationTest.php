<?php

namespace Tests\Feature\Api\Mobile;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\DoctorConsultationTariff;
use App\Models\MedicalUnit;
use App\Models\MobileWalletAccount;
use App\Models\MobileWalletConsultationQuote;
use App\Models\MobileWalletMovement;
use App\Models\MobileWalletRecharge;
use App\Models\MobileWalletServicePayment;
use App\Models\OperationalProfile;
use App\Models\Patient;
use App\Models\ProcedureArea;
use App\Models\User;
use App\Services\DoctorConsultationTariffService;
use App\Services\Wallet\MobileWalletConsultationService;
use App\Services\Wallet\WalletPaymentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Tests\TestCase;

class MobileWalletConsultationTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/mobile/v1/patient/wallet';

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('wallet-payments', [
            'enabled' => true, 'live_enabled' => false, 'service_redemption_enabled' => true, 'mode' => 'test',
            'secret_key' => 'sk_test_'.str_repeat('S', 24), 'publishable_key' => 'pk_test_'.str_repeat('P', 24),
            'webhook_secret' => 'whsec_'.str_repeat('W', 24), 'account_id' => 'acct_ConsultationFixture123',
            'merchant_identifier' => 'merchant.mx.klini', 'api_version' => '2026-10-28.endive',
        ]);
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        try {
            Http::assertNothingSent();
        } finally {
            parent::tearDown();
        }
    }

    private function user(string $role = 'patient'): User
    {
        $id = (string) Str::uuid();

        return User::create(['name' => 'Consulta de prueba', 'username' => $id, 'email' => $id.'@test.local',
            'role' => $role, 'module' => $role, 'status' => 'active', 'is_demo' => false]);
    }

    private function authorize(User $user, array $abilities = ['mobile:access'], bool $expired = false): void
    {
        Auth::forgetGuards();
        $this->withToken($user->createToken('consultation-test', $abilities, $expired ? now()->subMinute() : now()->addHour())->plainTextToken);
    }

    private function webActor(User $user): void
    {
        Auth::forgetGuards();
        $this->withHeader('Authorization', '');
        $this->actingAs($user, 'web');
    }

    private function fixture(int $balance = 100000, bool $withTariff = true, array $appointmentChanges = [], string $mode = 'test'): array
    {
        $user = $this->user();
        $patient = Patient::create(['user_id' => $user->id, 'full_name' => 'Paciente de consulta', 'status' => 'active']);
        $doctorUser = $this->user('doctor');
        $unit = MedicalUnit::create(['name' => 'Unidad de consulta de prueba', 'status' => 'active']);
        $room = ProcedureArea::create(['medical_unit_id' => $unit->id, 'type' => 'consulting', 'unit_number' => 'C-'.Str::uuid(), 'location' => 'Consulta externa', 'status' => 'active', 'simultaneous_capacity' => 1]);
        $doctor = Doctor::create(['user_id' => $doctorUser->id, 'medical_unit_id' => $unit->id,
            'full_name' => 'Médico de consulta', 'specialty' => 'Medicina general', 'status' => 'active']);
        $tariff = null;
        if ($withTariff) {
            $tariff = DoctorConsultationTariff::create(['doctor_id' => $doctor->id, 'version' => 1, 'modality' => 'in_person',
                'amount_cents' => 25000, 'currency' => 'MXN', 'created_by' => $doctorUser->id, 'created_at' => now()]);
            $doctor->update(['current_consultation_tariff_id' => $tariff->id]);
        }
        $appointment = Appointment::create(array_replace(['patient_id' => $patient->id, 'doctor_id' => $doctor->id,
            'medical_unit_id' => $unit->id, 'procedure_area_id' => $room->id, 'specialty' => $doctor->specialty,
            'modality' => 'Presencial', 'location' => 'Consultorio de prueba', 'status' => 'confirmed',
            'starts_at' => now()->addDays(2)->setTime(10, 0), 'ends_at' => now()->addDays(2)->setTime(10, 30)], $appointmentChanges));
        $account = MobileWalletAccount::create(['user_id' => $user->id, 'mode' => $mode, 'currency' => 'MXN', 'scope' => 'health_services']);
        $recharge = MobileWalletRecharge::create(['id' => (string) Str::uuid(), 'wallet_account_id' => $account->id,
            'client_request_id' => (string) Str::uuid(), 'amount_cents' => max(5000, $balance), 'status' => 'succeeded']);
        if ($balance > 0) {
            $account->movements()->create(['id' => (string) Str::uuid(), 'recharge_id' => $recharge->id, 'service_payment_id' => null,
                'type' => 'recharge', 'amount_cents' => $balance, 'source_key' => 'fixture:'.$mode.':'.$recharge->id, 'created_at' => now()]);
        }

        return compact('user', 'patient', 'doctorUser', 'doctor', 'unit', 'room', 'tariff', 'appointment', 'account', 'recharge');
    }

    private function quote(array $fixture): array
    {
        $this->authorize($fixture['user']);

        return $this->postJson(self::BASE.'/consultations/'.$fixture['appointment']->id.'/quote')
            ->assertSuccessful()->assertJsonPath('success', true)->json('data.quote');
    }

    private function pay(array $fixture, ?array $quote = null, ?string $key = null): array
    {
        $quote ??= $this->quote($fixture);
        $this->authorize($fixture['user']);

        return $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => $key ?? (string) Str::uuid()])
            ->assertSuccessful()->assertJsonPath('success', true)->json('data');
    }

    private function assertReversed(array $fixture, string $paymentId): void
    {
        $payment = MobileWalletServicePayment::findOrFail($paymentId);
        $this->assertSame('reversed', $payment->status);
        $this->assertNotNull($payment->reversed_at);
        $this->assertSame(100000, $fixture['account']->balanceCents());
        $this->assertSame(1, $payment->movements()->where('amount_cents', 25000)->count());
        $this->assertSame(1, $payment->movements()->where('amount_cents', -25000)->count());
    }

    public function test_consultation_endpoints_require_real_active_patient_bearer_tokens(): void
    {
        $id = (string) Str::uuid();
        $this->getJson(self::BASE.'/consultations')->assertUnauthorized();
        $this->postJson(self::BASE.'/consultations/1/quote')->assertUnauthorized();
        $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $id, 'client_request_id' => $id])->assertUnauthorized();
        foreach (['doctor', 'provider', 'admin'] as $role) {
            $this->authorize($this->user($role));
            $this->getJson(self::BASE.'/consultations')->assertForbidden();
        }
        $f = $this->fixture();
        $this->authorize($f['user'], ['unrelated:read']);
        $this->getJson(self::BASE.'/consultations')->assertForbidden();
        $this->authorize($f['user'], ['mobile:access'], true);
        $this->getJson(self::BASE.'/consultations')->assertUnauthorized();
    }

    public function test_get_lists_only_own_appointments_without_creating_quotes_payments_or_movements(): void
    {
        $f = $this->fixture();
        $this->fixture();
        $before = MobileWalletMovement::count();
        $this->authorize($f['user']);
        $this->getJson(self::BASE.'/consultations')->assertOk()->assertJsonCount(1, 'data.appointments')
            ->assertJsonPath('data.appointments.0.id', $f['appointment']->id)
            ->assertJsonPath('data.appointments.0.tariff.amount_cents', 25000)
            ->assertJsonPath('data.appointments.0.quote', null)->assertJsonPath('data.appointments.0.payment', null);
        $this->assertDatabaseCount('mobile_wallet_consultation_quotes', 0);
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
        $this->assertSame($before, MobileWalletMovement::count());
    }

    public function test_quote_uses_server_tariff_and_never_changes_appointment_or_balance(): void
    {
        $f = $this->fixture();
        $before = $f['appointment']->fresh()->getRawOriginal();
        $quote = $this->quote($f);
        $this->assertTrue(Str::isUuid($quote['id']));
        $this->assertSame($f['appointment']->id, $quote['appointment_id']);
        $this->assertSame($f['tariff']->id, $quote['tariff_id']);
        $this->assertSame(1, $quote['tariff_version']);
        $this->assertSame(25000, $quote['amount_cents']);
        $this->assertSame('valid', $quote['status']);
        $this->assertSame('MXN', $quote['currency']);
        $this->assertSame('health_services', $quote['scope']);
        $this->assertSame('test', $quote['mode']);
        $this->assertSame($before, $f['appointment']->fresh()->getRawOriginal());
        $this->assertSame(100000, $f['account']->balanceCents());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
    }

    public function test_another_patient_cannot_quote_or_pay_the_owners_quote(): void
    {
        $owner = $this->fixture();
        $quote = $this->quote($owner);
        $other = $this->fixture();
        $this->authorize($other['user']);
        $this->postJson(self::BASE.'/consultations/'.$owner['appointment']->id.'/quote')->assertNotFound();
        $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])->assertNotFound();
        $this->assertSame(100000, $owner['account']->balanceCents());
        $this->assertSame(100000, $other['account']->balanceCents());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
    }

    public function test_only_future_confirmed_assigned_in_person_appointments_can_be_quoted(): void
    {
        foreach ([['status' => 'scheduled'], ['status' => 'cancelled'], ['starts_at' => now()->subDay()],
            ['modality' => 'Video llamada'], ['doctor_id' => null]] as $changes) {
            $f = $this->fixture(100000, true, $changes);
            $this->authorize($f['user']);
            $this->postJson(self::BASE.'/consultations/'.$f['appointment']->id.'/quote')->assertConflict();
        }
        $this->assertDatabaseCount('mobile_wallet_consultation_quotes', 0);
    }

    public function test_inactive_patient_doctor_or_doctor_owner_cannot_enter_payment_flow(): void
    {
        foreach (['patient', 'doctor', 'doctorUser'] as $target) {
            $f = $this->fixture();
            $f[$target]->update(['status' => 'inactive']);
            $this->authorize($f['user']);
            $response = $this->postJson(self::BASE.'/consultations/'.$f['appointment']->id.'/quote');
            $this->assertContains($response->getStatusCode(), [403, 409]);
        }
        $this->assertDatabaseCount('mobile_wallet_consultation_quotes', 0);
    }

    public function test_unpublished_tariff_is_visible_as_missing_and_cannot_create_quote(): void
    {
        $f = $this->fixture(100000, false);
        $this->authorize($f['user']);
        $this->getJson(self::BASE.'/consultations')->assertOk()->assertJsonPath('data.appointments.0.tariff', null);
        $this->postJson(self::BASE.'/consultations/'.$f['appointment']->id.'/quote')->assertConflict();
        $this->assertDatabaseCount('mobile_wallet_consultation_quotes', 0);
    }

    public function test_accepted_quote_honors_immutable_price_when_doctor_changes_or_withdraws_tariff(): void
    {
        $f = $this->fixture();
        $quote = $this->quote($f);
        $before = MobileWalletConsultationQuote::findOrFail($quote['id'])->getRawOriginal();
        $newTariff = app(DoctorConsultationTariffService::class)->publish($f['doctorUser'], '400.00', $f['tariff']->id);
        $this->assertSame($quote['id'], $this->quote($f)['id']);
        app(DoctorConsultationTariffService::class)->withdraw($f['doctorUser'], $newTariff->id);
        $this->assertSame($quote['id'], $this->quote($f)['id']);
        $data = $this->pay($f, $quote);
        $this->assertSame(25000, $data['payment']['amount_cents']);
        $this->assertSame(75000, $data['wallet']['balance_cents']);
        $this->assertSame(25000, $f['tariff']->fresh()->amount_cents);
        $this->assertSame(25000, MobileWalletConsultationQuote::findOrFail($quote['id'])->amount_cents);
        $this->assertSame($before, MobileWalletConsultationQuote::findOrFail($quote['id'])->getRawOriginal());
    }

    public function test_quote_expires_without_debit_after_fifteen_minutes(): void
    {
        $f = $this->fixture();
        $quote = $this->quote($f);
        $this->travel(16)->minutes();
        $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])->assertConflict();
        $this->getJson(self::BASE.'/consultations')->assertOk()->assertJsonPath('data.appointments.0.quote.status', 'expired');
        $this->assertSame(100000, $f['account']->balanceCents());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
    }

    public function test_material_appointment_changes_invalidate_old_quotes_without_a_charge(): void
    {
        foreach (['starts_at', 'ends_at', 'location', 'specialty', 'modality', 'doctor_id', 'medical_unit_id', 'procedure_area_id'] as $field) {
            $f = $this->fixture();
            $quote = $this->quote($f);
            $replacement = match ($field) {
                'starts_at', 'ends_at' => $f['appointment']->{$field}->copy()->addHour(),
                'doctor_id' => Doctor::create(['full_name' => 'Otro médico', 'status' => 'active'])->id,
                'medical_unit_id' => MedicalUnit::create(['name' => 'Otra unidad', 'status' => 'active'])->id,
                'procedure_area_id' => ProcedureArea::create(['medical_unit_id' => $f['unit']->id, 'type' => 'consulting', 'unit_number' => 'Otro', 'status' => 'active'])->id,
                'modality' => 'Video llamada',
                default => 'Valor material diferente',
            };
            $f['appointment']->update([$field => $replacement]);
            $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])->assertConflict();
            $this->assertSame(100000, $f['account']->balanceCents());
        }
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
    }

    public function test_paying_existing_confirmed_appointment_creates_one_signed_service_ledger_entry(): void
    {
        $f = $this->fixture();
        $quote = $this->quote($f);
        $data = $this->pay($f, $quote);
        $this->assertSame('paid', $data['payment']['status']);
        $this->assertSame($f['appointment']->id, $data['payment']['appointment_id']);
        $this->assertSame($quote['id'], $data['payment']['quote_id']);
        $this->assertSame(75000, $data['wallet']['balance_cents']);
        $this->assertDatabaseCount('appointments', 1);
        $this->assertDatabaseCount('mobile_wallet_service_payments', 1);
        $movement = MobileWalletMovement::where('service_payment_id', $data['payment']['id'])->firstOrFail();
        $this->assertSame('service_payment', $movement->type);
        $this->assertSame(-25000, $movement->amount_cents);
        $this->assertNull($movement->recharge_id);
        $this->assertSame($f['account']->id, $movement->wallet_account_id);
        $this->getJson(self::BASE.'/consultations')->assertOk()->assertJsonPath('data.appointments.0.quote.status', 'paid');
    }

    public function test_insufficient_or_blocked_wallet_cannot_pay_and_never_partially_mutates_state(): void
    {
        foreach ([false, true] as $blocked) {
            $f = $this->fixture($blocked ? 100000 : 20000);
            $quote = $this->quote($f);
            if ($blocked) {
                $f['account']->update(['blocked' => true, 'blocked_reason' => 'payment_review']);
            }
            $before = $f['account']->balanceCents();
            $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])->assertConflict();
            $this->assertSame($before, $f['account']->balanceCents());
            $this->assertSame('confirmed', $f['appointment']->fresh()->status);
        }
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
    }

    public function test_payment_rejects_bad_identifiers_or_client_amount_mode_and_account_overrides(): void
    {
        $f = $this->fixture();
        $quote = $this->quote($f);
        foreach ([['quote_id' => 'invalid', 'client_request_id' => (string) Str::uuid()],
            ['quote_id' => $quote['id'], 'client_request_id' => 'invalid'],
            ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid(), 'amount_cents' => 1, 'mode' => 'live', 'wallet_account_id' => 999999]] as $body) {
            $this->postJson(self::BASE.'/consultation-payments', $body)->assertUnprocessable();
        }
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
        $this->assertSame(100000, $f['account']->balanceCents());
    }

    public function test_same_request_key_returns_original_payment_even_after_reversal_and_conflicts_for_other_quote(): void
    {
        $f = $this->fixture();
        $quote = $this->quote($f);
        $otherQuote = MobileWalletConsultationQuote::findOrFail($quote['id'])->replicate();
        $otherQuote->id = (string) Str::uuid();
        $otherQuote->save();
        $key = (string) Str::uuid();
        $first = $this->pay($f, $quote, $key);
        $again = $this->pay($f, $quote, $key);
        $this->assertSame($first['payment']['id'], $again['payment']['id']);
        $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $otherQuote->id, 'client_request_id' => $key])
            ->assertConflict()->assertJsonPath('error.code', 'idempotency_conflict');
        $f['appointment']->fresh()->update(['status' => 'cancelled']);
        $reversed = $this->pay($f, $quote, $key);
        $this->assertSame($first['payment']['id'], $reversed['payment']['id']);
        $this->assertSame('reversed', $reversed['payment']['status']);
        $this->assertSame(100000, $reversed['wallet']['balance_cents']);
        $this->assertDatabaseCount('mobile_wallet_service_payments', 1);
        $this->assertSame(2, MobileWalletServicePayment::firstOrFail()->movements()->count());
    }

    public function test_rejected_second_key_is_not_consumed_and_can_pay_a_different_appointment(): void
    {
        $f = $this->fixture();
        $quote = $this->quote($f);
        $otherQuote = MobileWalletConsultationQuote::findOrFail($quote['id'])->replicate();
        $otherQuote->id = (string) Str::uuid();
        $otherQuote->save();
        $first = $this->pay($f, $quote);
        $key = (string) Str::uuid();
        $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => $key])
            ->assertConflict()->assertJsonPath('error.code', 'consultation_already_paid');
        $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $otherQuote->id, 'client_request_id' => (string) Str::uuid()])
            ->assertConflict()->assertJsonPath('error.code', 'consultation_already_paid');
        $this->assertSame(75000, $f['account']->balanceCents());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 1);
        $this->assertSame(1, MobileWalletMovement::where('type', 'service_payment')->count());
        $next = $f['appointment']->replicate();
        $next->starts_at = $next->starts_at->copy()->addDay();
        $next->ends_at = $next->ends_at->copy()->addDay();
        $next->save();
        $nextFixture = array_replace($f, ['appointment' => $next]);
        $nextPayment = $this->pay($nextFixture, null, $key);
        $this->assertNotSame($first['payment']['id'], $nextPayment['payment']['id']);
        $this->assertSame($next->id, $nextPayment['payment']['appointment_id']);
        $this->assertSame(50000, $f['account']->balanceCents());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 2);
    }

    public function test_quote_and_funds_are_isolated_by_server_mode_and_live_never_spends_test_balance(): void
    {
        $f = $this->fixture();
        $quote = $this->quote($f);
        $live = MobileWalletAccount::create(['user_id' => $f['user']->id, 'mode' => 'live', 'currency' => 'MXN', 'scope' => 'health_services']);
        config()->set(['wallet-payments.mode' => 'live', 'wallet-payments.live_enabled' => true,
            'wallet-payments.secret_key' => 'sk_live_'.str_repeat('S', 24), 'wallet-payments.publishable_key' => 'pk_live_'.str_repeat('P', 24)]);
        $this->postJson('https://klini.test'.self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])->assertNotFound();
        $this->getJson('https://klini.test'.self::BASE)->assertOk()->assertJsonPath('data.balance_cents', 0)->assertJsonPath('data.mode', 'live');
        $this->assertSame(100000, $f['account']->balanceCents());
        $this->assertSame(0, $live->balanceCents());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
    }

    public function test_disabling_service_redemption_stops_new_debits_but_keeps_quote_readable(): void
    {
        $f = $this->fixture();
        $quote = $this->quote($f);
        config()->set('wallet-payments.service_redemption_enabled', false);
        $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])->assertStatus(503);
        $this->getJson(self::BASE.'/consultations')->assertOk()->assertJsonPath('data.appointments.0.quote.id', $quote['id']);
        $this->getJson(self::BASE)->assertOk()->assertJsonPath('data.payment_config.service_payments_enabled', false);
        $this->assertSame(100000, $f['account']->balanceCents());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
    }

    public function test_doctor_web_cancellation_reverses_the_same_service_payment_exactly_once(): void
    {
        $f = $this->fixture();
        $data = $this->pay($f);
        $this->webActor($f['doctorUser']);
        foreach ([1, 2] as $attempt) {
            $this->patch(route('doctor.appointments.status', $f['appointment']), ['status' => 'cancelled'])->assertRedirect()->assertSessionHasNoErrors();
        }
        $this->assertSame('cancelled', $f['appointment']->fresh()->status);
        $this->assertReversed($f, $data['payment']['id']);
    }

    public function test_doctor_mobile_cancellation_reverses_the_same_service_payment_exactly_once(): void
    {
        $f = $this->fixture();
        $data = $this->pay($f);
        $this->authorize($f['doctorUser']);
        foreach ([1, 2] as $attempt) {
            $this->patchJson('/api/mobile/v1/doctor/appointments/'.$f['appointment']->id, ['status' => 'cancelled'])->assertOk();
        }
        $this->assertReversed($f, $data['payment']['id']);
    }

    public function test_unit_cancellation_reverses_payment_even_when_blocked_but_never_clears_review_block(): void
    {
        $f = $this->fixture();
        $data = $this->pay($f);
        $f['account']->update(['blocked' => true, 'blocked_reason' => 'payment_review']);
        $actor = $this->user('unit');
        $f['unit']->update(['unit_username' => $actor->username]);
        $this->webActor($actor);
        foreach ([1, 2] as $attempt) {
            $this->patch(route('unit.appointments.status', $f['appointment']), ['unit' => $f['unit']->id,
                'status' => 'cancelled', 'notes' => 'Cancelación de prueba'])->assertRedirect()->assertSessionHasNoErrors();
            $this->assertIsArray($f['appointment']->fresh()->metadata);
            $this->assertSame('Cancelación de prueba', $f['appointment']->fresh()->metadata['last_status_note']);
            $this->assertSame($actor->id, $f['appointment']->fresh()->metadata['last_status_changed_by']);
        }
        $this->assertReversed($f, $data['payment']['id']);
        $this->assertTrue($f['account']->fresh()->blocked);
        $this->assertSame('payment_review', $f['account']->fresh()->blocked_reason);
    }

    public function test_outpatient_cancellation_requires_own_active_unit_and_reverses_only_own_appointment(): void
    {
        $f = $this->fixture();
        $data = $this->pay($f);
        $foreignActor = $this->user('operational');
        $foreignUnit = MedicalUnit::create(['name' => 'Unidad ajena', 'status' => 'active']);
        OperationalProfile::create(['user_id' => $foreignActor->id, 'medical_unit_id' => $foreignUnit->id, 'status' => 'active']);
        $this->webActor($foreignActor);
        $this->patchJson(route('outpatient.appointments.update', $f['appointment']), ['status' => 'cancelled'])->assertForbidden();
        $this->assertSame('paid', MobileWalletServicePayment::findOrFail($data['payment']['id'])->status);
        $this->assertSame('confirmed', $f['appointment']->fresh()->status);
        $actor = $this->user('operational');
        OperationalProfile::create(['user_id' => $actor->id, 'medical_unit_id' => $f['unit']->id, 'status' => 'active']);
        $this->webActor($actor);
        foreach ([1, 2] as $attempt) {
            $this->patch(route('outpatient.appointments.update', $f['appointment']), ['status' => 'cancelled'])->assertRedirect()->assertSessionHasNoErrors();
        }
        $this->assertReversed($f, $data['payment']['id']);
    }

    public function test_paid_or_reversed_history_rejects_material_changes_and_reopening_cancelled_appointment(): void
    {
        $f = $this->fixture();
        $this->pay($f);
        foreach (['paid', 'reversed'] as $state) {
            if ($state === 'reversed') {
                $f['appointment']->fresh()->update(['status' => 'cancelled']);
            }
            foreach (['location' => 'Otra ubicación', 'starts_at' => now()->addDays(4)] as $field => $value) {
                $appointment = $f['appointment']->fresh();
                $before = $appointment->getRawOriginal();
                try {
                    $appointment->update([$field => $value]);
                    $this->fail('Payment history must reject material appointment changes.');
                } catch (HttpExceptionInterface $exception) {
                    $this->assertSame(409, $exception->getStatusCode());
                }
                $this->assertSame($before, $appointment->fresh()->getRawOriginal());
            }
        }
        try {
            $f['appointment']->fresh()->update(['status' => 'confirmed']);
            $this->fail('A canceled paid appointment must stay terminal.');
        } catch (HttpExceptionInterface $exception) {
            $this->assertSame(409, $exception->getStatusCode());
        }
        $this->assertSame('cancelled', $f['appointment']->fresh()->status);
        $this->assertDatabaseCount('appointments', 1);
        $this->assertDatabaseCount('mobile_wallet_service_payments', 1);
    }

    public function test_cancellation_and_reversal_roll_back_together_and_cancel_before_pay_cannot_debit(): void
    {
        $f = $this->fixture();
        $data = $this->pay($f);
        $appointment = $f['appointment']->fresh();
        $appointment->status = 'cancelled';
        $appointment->metadata = ['cancel_reason' => 'Reintento de prueba'];
        $dispatcher = MobileWalletMovement::getEventDispatcher();
        MobileWalletMovement::setEventDispatcher(clone $dispatcher);
        $reversalAttempted = false;
        MobileWalletMovement::created(function (MobileWalletMovement $movement) use ($data, &$reversalAttempted): void {
            if ($movement->service_payment_id === $data['payment']['id'] && $movement->type === 'service_reversal') {
                $reversalAttempted = true;
                throw new RuntimeException('fixture_cancel_rollback');
            }
        });
        try {
            $appointment->save();
            $this->fail('The fixture transaction must abort.');
        } catch (RuntimeException $exception) {
            $this->assertSame('fixture_cancel_rollback', $exception->getMessage());
        } finally {
            MobileWalletMovement::setEventDispatcher($dispatcher);
        }
        $this->assertTrue($reversalAttempted);
        $this->assertSame('confirmed', $f['appointment']->fresh()->status);
        $this->assertSame('paid', MobileWalletServicePayment::findOrFail($data['payment']['id'])->status);
        $this->assertSame(75000, $f['account']->balanceCents());
        $this->assertSame(1, MobileWalletServicePayment::findOrFail($data['payment']['id'])->movements()->count());
        $this->assertTrue($appointment->isDirty('status'));
        $this->assertSame('cancelled', $appointment->status);
        $this->assertSame(['cancel_reason' => 'Reintento de prueba'], $appointment->metadata);

        $appointment->save();
        $this->assertSame('cancelled', $appointment->fresh()->status);
        $this->assertSame(['cancel_reason' => 'Reintento de prueba'], $appointment->fresh()->metadata);
        $this->assertReversed($f, $data['payment']['id']);
        $appointment->save();
        $this->assertReversed($f, $data['payment']['id']);

        $other = $this->fixture();
        $quote = $this->quote($other);
        $other['appointment']->fresh()->update(['status' => 'cancelled']);
        $this->postJson(self::BASE.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])->assertConflict();
        $this->assertSame(100000, $other['account']->balanceCents());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 1);
    }

    public function test_in_progress_and_completed_consultation_do_not_reverse_a_paid_service(): void
    {
        $f = $this->fixture();
        $data = $this->pay($f);
        foreach (['in_progress', 'completed'] as $status) {
            $f['appointment']->fresh()->update(['status' => $status]);
            $payment = MobileWalletServicePayment::findOrFail($data['payment']['id']);
            $this->assertSame('paid', $payment->status);
            $this->assertNull($payment->reversed_at);
            $this->assertSame(1, $payment->movements()->count());
            $this->assertSame(75000, $f['account']->balanceCents());
        }
    }

    public function test_former_doctor_cannot_cancel_a_reassigned_paid_appointment_from_a_stale_web_or_mobile_read(): void
    {
        foreach (['web', 'mobile'] as $channel) {
            $f = $this->fixture();
            $newOwner = $this->fixture();
            if ($channel === 'web') {
                $this->webActor($f['doctorUser']);
            } else {
                $this->authorize($f['doctorUser']);
            }
            $dispatcher = Appointment::getEventDispatcher();
            Appointment::setEventDispatcher(clone $dispatcher);
            $armed = true;
            $paymentId = null;
            Appointment::retrieved(function (Appointment $model) use ($f, $newOwner, &$armed, &$paymentId): void {
                if (! $armed || $model->id !== $f['appointment']->id) {
                    return;
                }
                $armed = false;
                // Simulate reassignment and a committed payment after binding, before the actor's mutation.
                DB::table('appointments')->where('id', $model->id)->update(['doctor_id' => $newOwner['doctor']->id]);
                $service = app(MobileWalletConsultationService::class);
                $quote = $service->quote($f['user'], $model->id)['quote'];
                $paymentId = $service->pay($f['user'], $quote['id'], (string) Str::uuid())['payment']['id'];
            });
            try {
                $url = $channel === 'web' ? route('doctor.appointments.status', $f['appointment'])
                    : '/api/mobile/v1/doctor/appointments/'.$f['appointment']->id;
                $this->patchJson($url, ['status' => 'cancelled'])->assertNotFound();
            } finally {
                Appointment::setEventDispatcher($dispatcher);
            }
            $this->assertNotNull($paymentId);
            $this->assertSame($newOwner['doctor']->id, $f['appointment']->fresh()->doctor_id);
            $this->assertSame('confirmed', $f['appointment']->fresh()->status);
            $this->assertSame('paid', MobileWalletServicePayment::findOrFail($paymentId)->status);
            $this->assertSame(1, MobileWalletMovement::where('service_payment_id', $paymentId)->count());
            $this->assertSame(75000, $f['account']->balanceCents());
        }
    }

    public function test_former_unit_cannot_reverse_payment_when_route_binding_precedes_reassignment(): void
    {
        $f = $this->fixture();
        $newOwner = $this->fixture();
        $actor = $this->user('unit');
        $f['unit']->update(['unit_username' => $actor->username]);
        $this->webActor($actor);
        $dispatcher = Appointment::getEventDispatcher();
        Appointment::setEventDispatcher(clone $dispatcher);
        $armed = true;
        $paymentId = null;
        Appointment::retrieved(function (Appointment $model) use ($f, $newOwner, &$armed, &$paymentId): void {
            if (! $armed || $model->id !== $f['appointment']->id) {
                return;
            }
            $armed = false;
            DB::table('appointments')->where('id', $model->id)->update([
                'medical_unit_id' => $newOwner['unit']->id, 'procedure_area_id' => $newOwner['room']->id,
            ]);
            $service = app(MobileWalletConsultationService::class);
            $quote = $service->quote($f['user'], $model->id)['quote'];
            $paymentId = $service->pay($f['user'], $quote['id'], (string) Str::uuid())['payment']['id'];
        });
        try {
            $this->patchJson(route('unit.appointments.status', $f['appointment']), ['unit' => $f['unit']->id,
                'status' => 'cancelled', 'notes' => 'Cancelación por actor anterior'])->assertForbidden();
        } finally {
            Appointment::setEventDispatcher($dispatcher);
        }
        $this->assertNotNull($paymentId);
        $this->assertSame($newOwner['unit']->id, $f['appointment']->fresh()->medical_unit_id);
        $this->assertSame('confirmed', $f['appointment']->fresh()->status);
        $this->assertSame('paid', MobileWalletServicePayment::findOrFail($paymentId)->status);
        $this->assertSame(1, MobileWalletMovement::where('service_payment_id', $paymentId)->count());
        $this->assertSame(75000, $f['account']->balanceCents());
    }

    public function test_live_consultations_exclude_demo_doctors_before_quote_or_payment(): void
    {
        $f = $this->fixture();
        config()->set(['wallet-payments.mode' => 'live', 'wallet-payments.live_enabled' => true,
            'wallet-payments.secret_key' => 'sk_live_'.str_repeat('S', 24), 'wallet-payments.publishable_key' => 'pk_live_'.str_repeat('P', 24)]);
        $this->authorize($f['user']);
        $url = 'https://klini.test'.self::BASE;
        $quote = $this->postJson($url.'/consultations/'.$f['appointment']->id.'/quote')->assertOk()->json('data.quote');
        $this->assertSame('live', $quote['mode']);
        $f['doctorUser']->update(['is_demo' => true]);
        $this->getJson($url.'/consultations')->assertOk()->assertJsonCount(0, 'data.appointments');
        $this->postJson($url.'/consultations/'.$f['appointment']->id.'/quote')->assertConflict();
        $this->postJson($url.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])->assertConflict();
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
        $this->assertSame(100000, $f['account']->balanceCents());
        $this->assertSame(0, MobileWalletAccount::where('user_id', $f['user']->id)->where('mode', 'live')->firstOrFail()->balanceCents());
    }

    public function test_live_payment_missing_webhook_configuration_never_debits_existing_balance(): void
    {
        config()->set(['wallet-payments.mode' => 'live', 'wallet-payments.live_enabled' => true,
            'wallet-payments.secret_key' => 'sk_live_'.str_repeat('S', 24), 'wallet-payments.publishable_key' => 'pk_live_'.str_repeat('P', 24)]);
        $f = $this->fixture(100000, true, [], 'live');
        $this->authorize($f['user']);
        $url = 'https://klini.test'.self::BASE;
        $quote = $this->postJson($url.'/consultations/'.$f['appointment']->id.'/quote')->assertOk()->json('data.quote');
        $before = $f['appointment']->fresh()->getRawOriginal();
        config()->set('wallet-payments.webhook_secret', '');

        $this->postJson($url.'/consultation-payments', ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()])
            ->assertStatus(503)->assertJsonPath('error.code', 'payments_not_configured');

        $this->assertSame(100000, $f['account']->balanceCents());
        $this->assertSame('live', $f['account']->mode);
        $this->assertSame($before, $f['appointment']->fresh()->getRawOriginal());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
        $this->assertDatabaseCount('mobile_wallet_movements', 1);
        $this->assertDatabaseCount('mobile_wallet_consultation_quotes', 1);
    }

    public function test_live_response_snapshot_failure_rolls_back_payment_and_ledger_and_allows_same_key_retry(): void
    {
        config()->set(['wallet-payments.mode' => 'live', 'wallet-payments.live_enabled' => true,
            'wallet-payments.secret_key' => 'sk_live_'.str_repeat('S', 24), 'wallet-payments.publishable_key' => 'pk_live_'.str_repeat('P', 24)]);
        $f = $this->fixture(100000, true, [], 'live');
        $this->authorize($f['user']);
        $url = 'https://klini.test'.self::BASE;
        $quote = $this->postJson($url.'/consultations/'.$f['appointment']->id.'/quote')->assertOk()->json('data.quote');
        $before = $f['appointment']->fresh()->getRawOriginal();
        $body = ['quote_id' => $quote['id'], 'client_request_id' => (string) Str::uuid()];
        $webhookSecret = config('wallet-payments.webhook_secret');
        $dispatcher = MobileWalletServicePayment::getEventDispatcher();
        MobileWalletServicePayment::setEventDispatcher(clone $dispatcher);
        $created = false;
        MobileWalletServicePayment::created(function (MobileWalletServicePayment $payment) use ($quote, &$created): void {
            if ($payment->quote_id === $quote['id']) {
                $created = true;
                config()->set('wallet-payments.webhook_secret', '');
            }
        });
        try {
            $this->postJson($url.'/consultation-payments', $body)->assertStatus(503)->assertJsonPath('error.code', 'payments_not_configured');
        } finally {
            MobileWalletServicePayment::setEventDispatcher($dispatcher);
            config()->set('wallet-payments.webhook_secret', $webhookSecret);
        }

        $this->assertTrue($created, 'The failure must occur after creating the payment within the transaction.');
        $this->assertSame(100000, $f['account']->balanceCents());
        $this->assertSame($before, $f['appointment']->fresh()->getRawOriginal());
        $this->assertDatabaseCount('mobile_wallet_service_payments', 0);
        $this->assertDatabaseCount('mobile_wallet_movements', 1);
        $this->assertDatabaseCount('mobile_wallet_consultation_quotes', 1);
        $this->getJson($url.'/consultations')->assertOk()->assertJsonPath('data.appointments.0.quote.status', 'valid');

        $this->postJson($url.'/consultation-payments', $body)->assertOk()
            ->assertJsonPath('data.payment.quote_id', $quote['id'])->assertJsonPath('data.payment.status', 'paid')
            ->assertJsonPath('data.wallet.balance_cents', 75000);
        $this->assertDatabaseCount('mobile_wallet_service_payments', 1);
        $this->assertDatabaseCount('mobile_wallet_movements', 2);
        $this->assertSame($before, $f['appointment']->fresh()->getRawOriginal());
    }

    public function test_manual_patient_ownership_change_blocks_cancellation_without_touching_payment_or_balance(): void
    {
        $f = $this->fixture();
        $data = $this->pay($f);
        $otherUser = $this->user();
        // Unsupported manual data change, isolated to the fixture: the payment must fail closed.
        DB::table('patients')->where('id', $f['patient']->id)->update(['user_id' => $otherUser->id]);
        $appointment = $f['appointment']->fresh();
        $before = $appointment->getRawOriginal();

        try {
            $appointment->update(['status' => 'cancelled']);
            $this->fail('An ownership mismatch must prevent cancellation and reversal.');
        } catch (WalletPaymentException $exception) {
            $this->assertSame(409, $exception->httpStatus);
        }

        $this->assertSame($before, $f['appointment']->fresh()->getRawOriginal());
        $this->assertSame('confirmed', $f['appointment']->fresh()->status);
        $this->assertSame('paid', MobileWalletServicePayment::findOrFail($data['payment']['id'])->status);
        $this->assertNull(MobileWalletServicePayment::findOrFail($data['payment']['id'])->reversed_at);
        $this->assertSame(75000, $f['account']->balanceCents());
        $this->assertSame(1, MobileWalletMovement::where('service_payment_id', $data['payment']['id'])->count());
        $this->assertSame(0, MobileWalletMovement::where('type', 'service_reversal')->count());
    }
}
