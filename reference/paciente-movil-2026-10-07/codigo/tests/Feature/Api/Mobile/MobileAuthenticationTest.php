<?php

namespace Tests\Feature\Api\Mobile;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Notifications\MobileResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class MobileAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_can_login_and_read_their_identity(): void
    {
        $user = $this->createMobileUser('patient');
        $patient = Patient::query()->create([
            'user_id' => $user->id,
            'full_name' => 'Paciente Móvil',
            'status' => 'active',
        ]);

        $login = $this->postJson('/api/mobile/v1/auth/login', [
            'login' => $user->email,
            'password' => 'MobilePassword2026!',
            'device_name' => 'Pixel de pruebas',
        ]);

        $login->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.role', 'patient')
            ->assertJsonPath('data.user.profile_id', $patient->id)
            ->assertJsonStructure(['data' => ['access_token', 'expires_at', 'user']]);

        $plainTextToken = $login->json('data.access_token');

        $this->withToken($plainTextToken)
            ->getJson('/api/mobile/v1/me')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonMissingPath('data.user.password');

        $token = PersonalAccessToken::findToken($plainTextToken);

        $this->assertNotNull($token);
        $this->assertTrue($token->can('mobile:access'));
        $this->assertTrue($token->can('role:patient'));
        $this->assertNotNull($token->expires_at);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'mobile.auth.login',
        ]);
    }

    public function test_doctor_can_login_with_username(): void
    {
        $user = $this->createMobileUser('doctor');
        $doctor = Doctor::query()->create([
            'user_id' => $user->id,
            'full_name' => 'Dra. Móvil',
            'status' => 'active',
        ]);

        $this->postJson('/api/mobile/v1/auth/login', [
            'login' => $user->username,
            'password' => 'MobilePassword2026!',
            'device_name' => 'Android de consultorio',
        ])->assertCreated()
            ->assertJsonPath('data.user.role', 'doctor')
            ->assertJsonPath('data.user.profile_id', $doctor->id);
    }

    public function test_login_rejects_invalid_credentials_inactive_accounts_and_other_roles(): void
    {
        $patient = $this->createMobileUser('patient', 'active', 'patient-invalid');

        $this->postJson('/api/mobile/v1/auth/login', [
            'login' => $patient->username,
            'password' => 'incorrecta',
            'device_name' => 'Pixel',
        ])->assertUnauthorized()
            ->assertJsonPath('error.code', 'invalid_credentials');
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $patient->id,
            'event' => 'mobile.auth.login_failed',
        ]);

        $inactive = $this->createMobileUser('doctor', 'inactive', 'doctor-inactive');

        $this->postJson('/api/mobile/v1/auth/login', [
            'login' => $inactive->username,
            'password' => 'MobilePassword2026!',
            'device_name' => 'Pixel',
        ])->assertForbidden()
            ->assertJsonPath('error.code', 'account_inactive');

        $admin = $this->createMobileUser('admin', 'active', 'admin-mobile');

        $this->postJson('/api/mobile/v1/auth/login', [
            'login' => $admin->username,
            'password' => 'MobilePassword2026!',
            'device_name' => 'Pixel',
        ])->assertForbidden()
            ->assertJsonPath('error.code', 'role_not_allowed');
    }

    public function test_mobile_errors_use_the_uniform_json_contract(): void
    {
        $this->postJson('/api/mobile/v1/auth/login', [])
            ->assertUnprocessable()
            ->assertExactJson([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Los datos enviados no son válidos.',
                    'details' => [
                        'fields' => [
                            'login' => ['El usuario o correo es obligatorio.'],
                            'password' => ['La contraseña es obligatoria.'],
                            'device_name' => ['El nombre del dispositivo es obligatorio.'],
                        ],
                    ],
                ],
            ]);

        $this->getJson('/api/mobile/v1/me')
            ->assertUnauthorized()
            ->assertExactJson([
                'success' => false,
                'error' => [
                    'code' => 'unauthenticated',
                    'message' => 'La sesión no es válida o ha expirado.',
                ],
            ]);

        $this->getJson('/api/mobile/v1/route-that-does-not-exist')
            ->assertNotFound()
            ->assertExactJson([
                'success' => false,
                'error' => [
                    'code' => 'not_found',
                    'message' => 'El recurso solicitado no existe.',
                ],
            ]);
    }

    public function test_user_can_list_and_revoke_only_their_own_sessions(): void
    {
        $user = $this->createMobileUser('patient', 'active', 'patient-sessions');
        $otherUser = $this->createMobileUser('doctor', 'active', 'doctor-sessions');

        $currentToken = $user->createToken('Pixel actual', ['mobile:access', 'role:patient'], now()->addDays(30));
        $otherSession = $user->createToken('Tableta', ['mobile:access', 'role:patient'], now()->addDays(30));
        $foreignSession = $otherUser->createToken('Teléfono ajeno', ['mobile:access', 'role:doctor'], now()->addDays(30));

        $this->withToken($currentToken->plainTextToken)
            ->getJson('/api/mobile/v1/auth/sessions')
            ->assertOk()
            ->assertJsonCount(2, 'data.sessions')
            ->assertJsonFragment(['device_name' => 'Pixel actual', 'is_current' => true]);

        $this->withToken($currentToken->plainTextToken)
            ->deleteJson('/api/mobile/v1/auth/sessions/'.$foreignSession->accessToken->id)
            ->assertNotFound()
            ->assertJsonPath('error.code', 'session_not_found');

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $foreignSession->accessToken->id]);

        $this->withToken($currentToken->plainTextToken)
            ->deleteJson('/api/mobile/v1/auth/sessions/'.$otherSession->accessToken->id)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $otherSession->accessToken->id]);

        $this->withToken($currentToken->plainTextToken)
            ->postJson('/api/mobile/v1/auth/logout')
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $currentToken->accessToken->id]);
    }

    public function test_token_without_mobile_ability_is_rejected(): void
    {
        $user = $this->createMobileUser('doctor', 'active', 'doctor-web-token');
        $token = $user->createToken('Token sin permiso', ['profile:read'], now()->addDay());

        $this->withToken($token->plainTextToken)
            ->getJson('/api/mobile/v1/me')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'token_not_allowed');
    }

    public function test_password_recovery_does_not_reveal_if_an_account_exists(): void
    {
        Notification::fake();
        $user = $this->createMobileUser('patient', 'active', 'patient-recovery');

        $known = $this->postJson('/api/mobile/v1/auth/forgot-password', ['login' => $user->email]);
        $unknown = $this->postJson('/api/mobile/v1/auth/forgot-password', ['login' => 'unknown@example.test']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json('data.message'), $unknown->json('data.message'));
        Notification::assertSentTo($user, MobileResetPasswordNotification::class);
    }

    public function test_user_can_reset_password_with_a_valid_token(): void
    {
        $user = $this->createMobileUser('doctor', 'active', 'doctor-reset');
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/mobile/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewMobilePassword2026!',
            'password_confirmation' => 'NewMobilePassword2026!',
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertTrue(Hash::check('NewMobilePassword2026!', $user->fresh()->password));
        $this->assertDatabaseHas('audit_logs', ['user_id' => $user->id, 'event' => 'mobile.auth.password_reset']);
    }

    public function test_authenticated_user_can_change_password_and_other_sessions_are_revoked(): void
    {
        $user = $this->createMobileUser('patient', 'active', 'patient-change-password');
        $current = $user->createToken('Pixel', ['mobile:access', 'role:patient'], now()->addDay());
        $other = $user->createToken('Tableta', ['mobile:access', 'role:patient'], now()->addDay());

        $this->withToken($current->plainTextToken)->putJson('/api/mobile/v1/auth/password', [
            'current_password' => 'MobilePassword2026!',
            'password' => 'ChangedMobilePassword2026!',
            'password_confirmation' => 'ChangedMobilePassword2026!',
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->accessToken->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $other->accessToken->id]);
        $this->assertTrue(Hash::check('ChangedMobilePassword2026!', $user->fresh()->password));
    }

    public function test_roles_cannot_cross_mobile_modules_and_expired_tokens_are_rejected(): void
    {
        $patient = $this->createMobileUser('patient', 'active', 'patient-cross-access');
        Patient::query()->create(['user_id' => $patient->id, 'full_name' => 'Paciente', 'status' => 'active']);
        $doctor = $this->createMobileUser('doctor', 'active', 'doctor-cross-access');
        Doctor::query()->create(['user_id' => $doctor->id, 'full_name' => 'Doctor', 'status' => 'active']);

        $patientToken = $patient->createToken('Pixel', ['mobile:access', 'role:patient'], now()->addDay());
        $doctorToken = $doctor->createToken('Pixel', ['mobile:access', 'role:doctor'], now()->addDay());
        $expiredToken = $doctor->createToken('Viejo', ['mobile:access', 'role:doctor'], now()->subMinute());

        $this->withToken($patientToken->plainTextToken)->getJson('/api/mobile/v1/doctor/dashboard')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withToken($doctorToken->plainTextToken)->getJson('/api/mobile/v1/patient/profile')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withToken($expiredToken->plainTextToken)->getJson('/api/mobile/v1/me')->assertUnauthorized();
    }

    public function test_authenticated_user_can_enable_and_disable_only_their_push_device(): void
    {
        $user = $this->createMobileUser('patient', 'active', 'push-owner');
        $other = $this->createMobileUser('doctor', 'active', 'push-other');
        $token = $user->createToken('Pixel', ['mobile:access', 'role:patient'], now()->addDay());
        $otherToken = $other->createToken('Pixel', ['mobile:access', 'role:doctor'], now()->addDay());
        $pushToken = 'ExponentPushToken[klini_test_device_123]';

        $this->withToken($token->plainTextToken)->putJson('/api/mobile/v1/devices/push', [
            'push_token' => $pushToken,
            'platform' => 'android',
            'device_name' => 'Pixel 8 Pro',
        ])->assertCreated()->assertJsonPath('data.enabled', true);

        $this->assertDatabaseHas('mobile_device_registrations', [
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $pushToken),
            'enabled' => true,
        ]);

        $this->app['auth']->forgetGuards();
        $this->withToken($otherToken->plainTextToken)->deleteJson('/api/mobile/v1/devices/push', [
            'push_token' => $pushToken,
        ])->assertOk();
        $this->assertDatabaseHas('mobile_device_registrations', ['user_id' => $user->id, 'enabled' => true]);

        $this->app['auth']->forgetGuards();
        $this->withToken($token->plainTextToken)->deleteJson('/api/mobile/v1/devices/push', [
            'push_token' => $pushToken,
        ])->assertOk()->assertJsonPath('data.enabled', false);
        $this->assertDatabaseHas('mobile_device_registrations', ['user_id' => $user->id, 'enabled' => false]);
    }

    public function test_logout_disables_push_devices_linked_to_current_session(): void
    {
        $user = $this->createMobileUser('doctor', 'active', 'push-logout');
        $token = $user->createToken('Pixel', ['mobile:access', 'role:doctor'], now()->addDay());
        $pushToken = 'ExpoPushToken[logout_test_device_123]';

        $this->withToken($token->plainTextToken)->putJson('/api/mobile/v1/devices/push', [
            'push_token' => $pushToken,
            'platform' => 'android',
        ])->assertCreated();

        $this->app['auth']->forgetGuards();
        $this->withToken($token->plainTextToken)->postJson('/api/mobile/v1/auth/logout')->assertOk();
        $this->assertDatabaseHas('mobile_device_registrations', [
            'token_hash' => hash('sha256', $pushToken),
            'enabled' => false,
        ]);
    }

    private function createMobileUser(string $role, string $status = 'active', ?string $username = null): User
    {
        $username ??= $role.'-mobile';

        return User::query()->create([
            'name' => ucfirst($role).' Mobile',
            'username' => $username,
            'email' => $username.'@test.local',
            'password' => Hash::make('MobilePassword2026!'),
            'role' => $role,
            'module' => $role,
            'status' => $status,
        ]);
    }
}
