<?php

namespace App\Providers;

use App\Contracts\ThawaniGateway;
use App\Services\MockThawaniService;
use App\Services\ThawaniService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Single point deciding real vs. mock Thawani — everything else
        // (PaymentService, the mock checkout controller/routes) depends on
        // ThawaniGateway, never a concrete class. See
        // MockThawaniService::isActive() for the exact condition.
        $this->app->bind(ThawaniGateway::class, fn ($app) => MockThawaniService::isActive()
            ? $app->make(MockThawaniService::class)
            : $app->make(ThawaniService::class));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Turn silently-discarded mass-assignment attempts (e.g. against a
        // generated column like booking_slots.lock_key) into a loud exception
        // outside production, so protection gaps surface in tests, not prod.
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        // Keyed by IP + attempted email, so a brute-force attempt against
        // one admin account can't lock out other admins sharing the IP,
        // and a bad actor can't rotate emails to bypass the IP-only limit.
        RateLimiter::for('login', function (Request $request) {
            $key = strtolower((string) $request->input('email')).'|'.$request->ip();

            return Limit::perMinute(5)->by($key);
        });

        // Read-only, but every request still runs a real availability
        // query — generous enough for a customer clicking through the date
        // strip, tight enough to blunt scripted polling.
        RateLimiter::for('availability', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // Guest booking-lookup/cancel/retry/refresh endpoints (Step 12) are
        // public and keyed only by access_token in the URL — rate limit by
        // IP to blunt token-guessing/brute-force attempts.
        RateLimiter::for('guest-booking', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // Booking creation and quoting (Step 17 hardening): unlike the
        // self-service endpoints above, an unauthenticated POST /bookings
        // has a real side effect — a Thawani booking holds a court slot
        // for THAWANI_HOLD_MINUTES — so scripted abuse here directly
        // degrades availability for other customers, not just this
        // caller's own data. Tighter than guest-booking's 60/min
        // accordingly.
        RateLimiter::for('guest-booking-write', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });
    }
}
