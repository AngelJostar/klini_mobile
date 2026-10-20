<?php

use App\Http\Middleware\EnsureActionPermission;
use App\Http\Middleware\EnsureMobileRole;
use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\PreventStaleSessionPages;
use App\Support\MobileApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->appendToGroup('web', PreventStaleSessionPages::class);

        $middleware->alias([
            'permission' => EnsureActionPermission::class,
            'role' => EnsureUserRole::class,
            'mobile.role' => EnsureMobileRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isMobileApi = fn (Request $request): bool => $request->is('api/mobile/v1/*');

        $exceptions->render(function (AuthenticationException $exception, Request $request) use ($isMobileApi) {
            if ($isMobileApi($request)) {
                return MobileApiResponse::error('unauthenticated', 'La sesión no es válida o ha expirado.', 401);
            }
        });

        $exceptions->render(function (AuthorizationException $exception, Request $request) use ($isMobileApi) {
            if ($isMobileApi($request)) {
                return MobileApiResponse::error('forbidden', 'No tienes autorización para realizar esta acción.', 403);
            }
        });

        $exceptions->render(function (ValidationException $exception, Request $request) use ($isMobileApi) {
            if ($isMobileApi($request)) {
                return MobileApiResponse::error('validation_error', 'Los datos enviados no son válidos.', 422, [
                    'fields' => $exception->errors(),
                ]);
            }
        });

        $exceptions->render(function (ModelNotFoundException $exception, Request $request) use ($isMobileApi) {
            if ($isMobileApi($request)) {
                return MobileApiResponse::error('not_found', 'El recurso solicitado no existe.', 404);
            }
        });

        $exceptions->render(function (HttpExceptionInterface $exception, Request $request) use ($isMobileApi) {
            if (! $isMobileApi($request)) {
                return null;
            }

            $status = $exception->getStatusCode();
            [$code, $message] = match ($status) {
                404 => ['not_found', 'El recurso solicitado no existe.'],
                405 => ['method_not_allowed', 'El método solicitado no está permitido.'],
                429 => ['too_many_requests', 'Se realizaron demasiadas solicitudes. Inténtalo nuevamente más tarde.'],
                default => ['http_error', 'No fue posible procesar la solicitud.'],
            };

            return MobileApiResponse::error($code, $message, $status)
                ->withHeaders($exception->getHeaders());
        });

        $exceptions->render(function (TokenMismatchException $exception, Request $request) {
            if ($request->expectsJson()) {
                return null;
            }

            Auth::logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return redirect()
                ->route('login', ['session_expired' => 1]);
        });
    })
    ->create();
