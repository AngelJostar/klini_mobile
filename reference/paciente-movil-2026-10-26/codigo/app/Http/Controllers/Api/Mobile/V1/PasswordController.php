<?php

namespace App\Http\Controllers\Api\Mobile\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\MobileResetPasswordNotification;
use App\Support\MobileApiResponse;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

class PasswordController extends Controller
{
    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(['login' => ['required', 'string', 'max:255']]);
        $login = trim($data['login']);
        $user = User::query()
            ->where(fn ($query) => $query->where('username', $login)->orWhere('email', $login))
            ->whereIn('role', config('mobile-api.allowed_roles'))
            ->where('status', 'active')
            ->first();

        if ($user?->email) {
            $token = Password::broker()->createToken($user);
            $user->notify(new MobileResetPasswordNotification($token));
        }

        $this->audit($request, 'mobile.auth.password_requested', $user, [
            'login_fingerprint' => hash('sha256', mb_strtolower($login)),
        ]);

        return MobileApiResponse::success([
            'message' => 'Si la cuenta está disponible, recibirás instrucciones para restablecer la contraseña.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $user = null;
        $status = Password::broker()->reset($credentials, function (User $model, string $password) use (&$user): void {
            $model->forceFill([
                'password' => Hash::make($password),
                'remember_token' => Str::random(60),
            ])->save();
            $model->tokens()->delete();
            $user = $model;
            event(new PasswordReset($model));
        });

        if ($status !== Password::PASSWORD_RESET) {
            return MobileApiResponse::error(
                'invalid_reset_token',
                'El enlace de recuperación no es válido o expiró.',
                422,
            );
        }

        $this->audit($request, 'mobile.auth.password_reset', $user);

        return MobileApiResponse::success([
            'message' => 'La contraseña se actualizó correctamente. Ya puedes iniciar sesión.',
        ]);
    }

    public function change(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);
        $user = $request->user();
        $currentTokenId = $user->currentAccessToken()?->getKey();

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'remember_token' => Str::random(60),
        ])->save();
        $user->tokens()->when($currentTokenId, fn ($query) => $query->whereKeyNot($currentTokenId))->delete();
        $this->audit($request, 'mobile.auth.password_changed', $user);

        return MobileApiResponse::success([
            'message' => 'La contraseña se actualizó y las demás sesiones fueron cerradas.',
        ]);
    }

    private function audit(Request $request, string $event, ?User $user, array $context = []): void
    {
        AuditLog::query()->create([
            'user_id' => $user?->id,
            'event' => $event,
            'auditable_type' => $user ? User::class : null,
            'auditable_id' => $user?->id,
            'ip_address' => $request->ip(),
            'payload' => ['module' => 'klini_mobile', 'context' => $context],
        ]);
    }
}
