<?php

namespace App\Http\Controllers\Api\Mobile\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\V1\LoginRequest;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\MobileApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();
        $login = trim($credentials['login']);

        $user = User::query()
            ->where(function ($query) use ($login): void {
                $query->where('username', $login)
                    ->orWhere('email', $login);
            })
            ->first();

        if (! $user || ! $user->password || ! Hash::check($credentials['password'], $user->password)) {
            $this->auditAuthentication($request, 'mobile.auth.login_failed', $user, [
                'login_fingerprint' => hash('sha256', mb_strtolower($login)),
            ]);

            return MobileApiResponse::error(
                'invalid_credentials',
                'Las credenciales proporcionadas no son válidas.',
                401,
            );
        }

        if ($user->status !== 'active') {
            return MobileApiResponse::error(
                'account_inactive',
                'La cuenta no está disponible.',
                403,
            );
        }

        if (! in_array($user->role, config('mobile-api.allowed_roles'), true)) {
            return MobileApiResponse::error(
                'role_not_allowed',
                'Este perfil no tiene acceso a Klini Mobile.',
                403,
            );
        }

        $expiresAt = now()->addDays((int) config('mobile-api.token_expiration_days'));
        $token = $user->createToken(
            $credentials['device_name'],
            ['mobile:access', "role:{$user->role}"],
            $expiresAt,
        );
        $this->auditAuthentication($request, 'mobile.auth.login', $user, [
            'token_id' => $token->accessToken->getKey(),
        ]);

        return MobileApiResponse::success([
            'token_type' => 'Bearer',
            'access_token' => $token->plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $this->serializeUser($user),
        ], 201);
    }

    public function me(Request $request): JsonResponse
    {
        return MobileApiResponse::success([
            'user' => $this->serializeUser($request->user()),
        ]);
    }

    public function sessions(Request $request): JsonResponse
    {
        $currentTokenId = $request->user()->currentAccessToken()?->getKey();

        $sessions = $request->user()->tokens()
            ->latest()
            ->get()
            ->map(fn (PersonalAccessToken $token): array => [
                'id' => $token->getKey(),
                'device_name' => $token->name,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'expires_at' => $token->expires_at?->toIso8601String(),
                'is_current' => $token->getKey() === $currentTokenId,
            ])
            ->values();

        return MobileApiResponse::success(['sessions' => $sessions]);
    }

    public function logout(Request $request): JsonResponse
    {
        $tokenId = $request->user()->currentAccessToken()?->getKey();
        $this->auditAuthentication($request, 'mobile.auth.logout', $request->user(), [
            'token_id' => $tokenId,
        ]);
        $request->user()->mobileDeviceRegistrations()
            ->where('personal_access_token_id', $tokenId)
            ->update(['enabled' => false]);
        $request->user()->currentAccessToken()?->delete();

        return MobileApiResponse::success([
            'message' => 'La sesión se cerró correctamente.',
        ]);
    }

    public function revokeSession(Request $request, int $token): JsonResponse
    {
        $session = $request->user()->tokens()->whereKey($token)->first();

        if (! $session) {
            return MobileApiResponse::error(
                'session_not_found',
                'La sesión solicitada no existe.',
                404,
            );
        }

        $session->delete();
        $request->user()->mobileDeviceRegistrations()
            ->where('personal_access_token_id', $token)
            ->update(['enabled' => false]);

        return MobileApiResponse::success([
            'message' => 'La sesión fue revocada correctamente.',
        ]);
    }

    private function serializeUser(User $user): array
    {
        $user->loadMissing(['patient:id,user_id', 'doctor:id,user_id']);
        $role = UserRole::tryFrom($user->role);

        return [
            'id' => $user->getKey(),
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'role_label' => $role?->label(),
            'profile_id' => match ($role) {
                UserRole::Patient => $user->patient?->getKey(),
                UserRole::Doctor => $user->doctor?->getKey(),
                default => null,
            },
        ];
    }

    private function auditAuthentication(Request $request, string $event, ?User $user, array $context = []): void
    {
        AuditLog::query()->create([
            'user_id' => $user?->id,
            'event' => $event,
            'auditable_type' => $user ? User::class : null,
            'auditable_id' => $user?->id,
            'ip_address' => $request->ip(),
            'payload' => [
                'module' => 'klini_mobile',
                'context' => $context,
            ],
        ]);
    }
}
