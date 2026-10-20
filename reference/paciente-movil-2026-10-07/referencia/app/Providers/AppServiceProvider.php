<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::define('access-klini-mobile', fn (User $user): bool => $user->status === 'active'
            && in_array($user->role, config('mobile-api.allowed_roles'), true));

        RateLimiter::for('mobile-login', function (Request $request): Limit {
            $login = Str::lower((string) $request->input('login'));

            return Limit::perMinute(5)->by($login.'|'.$request->ip());
        });

        RateLimiter::for('mobile-api', function (Request $request): Limit {
            $actor = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(120)->by('mobile|'.$actor);
        });

        if ($this->app->environment('production') && config('drsam.review_passwordless')) {
            throw new RuntimeException('DRSAM_REVIEW_PASSWORDLESS must be disabled in production.');
        }
    }
}
