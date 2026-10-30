<?php

namespace App\Http\Middleware;

use App\Support\MobileApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

class EnsureMobileRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || $user->status !== 'active') {
            return MobileApiResponse::error(
                'account_inactive',
                'La cuenta no está disponible.',
                403,
            );
        }

        if (! Gate::forUser($user)->allows('access-klini-mobile') || ! in_array($user->role, $roles, true)) {
            return MobileApiResponse::error(
                'role_not_allowed',
                'Este perfil no tiene acceso a Klini Mobile.',
                403,
            );
        }

        if (! $user->tokenCan('mobile:access')) {
            return MobileApiResponse::error(
                'token_not_allowed',
                'La sesión no tiene acceso a Klini Mobile.',
                403,
            );
        }

        return $next($request);
    }
}
