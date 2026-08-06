<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Unused: bootstrap/app.php deliberately does not call
    | $middleware->statefulApi(), so EnsureFrontendRequestsAreStateful never
    | runs and this list is never consulted. Admin auth is 100% stateless
    | Sanctum personal-access tokens (Authorization: Bearer <token>) — see
    | AdminAuthController — which needs no cookie/session domain matching.
    | Left in place only because Sanctum's config file expects the key to
    | exist; safe to ignore.
    |
    */

    'stateful' => explode(',', (string) env(
        'SANCTUM_STATEFUL_DOMAINS',
        'localhost,localhost:5173,127.0.0.1,127.0.0.1:5173'
    )),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | Fallback guard(s) Sanctum's token guard checks *before* looking for a
    | bearer token. In production this never matches anything real: with no
    | session middleware on the 'api' group (see bootstrap/app.php), the
    | 'admin' session guard never has a logged-in user to find, so every
    | real request is authenticated purely by its Authorization: Bearer
    | token. This still matters for the test suite, though — Laravel's
    | $this->actingAs($admin, 'admin') test helper authenticates this same
    | 'admin' guard in memory (no real session involved), which is how the
    | non-auth-focused admin feature tests (courts, closures, pricing
    | rules, bookings) simulate "logged in" without minting a real token.
    |
    */

    'guard' => ['admin'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This value controls the number of minutes until an issued token will be
    | considered expired. Null means tokens never expire. Since this project
    | uses session-based SPA auth (not long-lived API tokens), this is left
    | at the default.
    |
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | When authenticating your first-party SPA with Sanctum you may need to
    | customize some of the middleware Sanctum uses while processing the
    | request. You may change the middleware listed below as required.
    |
    */

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];
