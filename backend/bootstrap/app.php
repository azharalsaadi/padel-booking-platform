<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Prepends Sanctum's EnsureFrontendRequestsAreStateful to the 'api'
        // group, enabling cookie-session auth for the React SPA.
        $middleware->statefulApi();

        // This app has no named 'login' route (no session-based web UI —
        // admin auth is the SPA's own login screen). Laravel's framework
        // default (set unconditionally in ApplicationBuilder::withMiddleware,
        // before this closure runs) redirects unauthenticated non-JSON
        // requests to route('login'), which throws RouteNotFoundException
        // since that route doesn't exist. Overriding it to null removes
        // that redirect attempt entirely; shouldRenderJsonWhen() below is
        // what then turns the resulting AuthenticationException into a
        // clean 401 instead of Laravel's HTML "guest redirect" fallback.
        $middleware->redirectGuestsTo(fn () => null);

        // Gates the local Thawani checkout simulator (THAWANI_MODE=mock,
        // local/testing only) — see routes/api.php and
        // EnsureThawaniMockActive.
        $middleware->alias(['thawani.mock' => \App\Http\Middleware\EnsureThawaniMockActive::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Every route this app serves under /api is a JSON API with no
        // server-rendered fallback (there is no named 'login' route, no
        // session-based web UI). Laravel's default exception rendering
        // decides JSON-vs-HTML from the request's Accept header alone, so
        // a client that omits it — a bare browser visit to an API URL, a
        // non-browser HTTP client, or any request missing the header for
        // any reason — falls through to guest()->redirect(route('login'))
        // for auth failures, which throws (no such route exists), and to
        // an HTML error page for everything else. Forcing JSON for every
        // /api/* request, regardless of Accept, fixes both: a real,
        // reproducible 500 discovered in Step 16 integration testing, and
        // the same class of bug for every other exception type on the API.
        $exceptions->shouldRenderJsonWhen(fn ($request, $e) => $request->is('api/*') || $request->expectsJson());
    })->create();

// This project ships and owns its own complete config/*.php files (the full
// laravel/laravel skeleton, not the newer stripped-down one), so Laravel's
// "zero-config" feature — which unconditionally deep-merges config/auth.php's
// guards/providers/passwords with the framework's own bundled defaults
// (vendor/laravel/framework/config/auth.php, containing a 'web' guard and
// 'users' provider pointing at a customer User model we don't have) — is
// disabled. Without this, that unused guard/provider/model reappears in
// config('auth.*') no matter what config/auth.php itself says.
$app->dontMergeFrameworkConfiguration();

return $app;
