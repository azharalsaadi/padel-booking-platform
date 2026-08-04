<?php

namespace Tests\Feature\Auth;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login');

        // Sanctum's EnsureFrontendRequestsAreStateful only attaches session
        // handling (StartSession, CSRF) when a request presents as coming
        // from a configured stateful domain (via Referer/Origin). Without
        // this, $request->session() throws in the controller — exactly as
        // the real React frontend's requests will present.
        $this->withHeader('Referer', 'http://localhost:5173/');
    }

    public function test_admin_can_login_with_valid_credentials(): void
    {
        $admin = AdminUser::factory()->create([
            'email' => 'admin@padel.test',
            'password' => 'Password123!',
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'admin@padel.test',
            'password' => 'Password123!',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.email', 'admin@padel.test');
        $this->assertAuthenticatedAs($admin, 'admin');
    }

    public function test_login_fails_with_invalid_email_and_does_not_reveal_which_field_was_wrong(): void
    {
        AdminUser::factory()->create(['email' => 'admin@padel.test', 'password' => 'Password123!']);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'nobody@padel.test',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('email');
        $this->assertGuest('admin');
    }

    public function test_login_fails_with_invalid_password_using_the_same_generic_message(): void
    {
        AdminUser::factory()->create(['email' => 'admin@padel.test', 'password' => 'Password123!']);

        $wrongEmail = $this->postJson('/api/admin/login', [
            'email' => 'nobody@padel.test',
            'password' => 'Password123!',
        ]);

        $wrongPassword = $this->postJson('/api/admin/login', [
            'email' => 'admin@padel.test',
            'password' => 'totally-wrong-password',
        ]);

        $wrongPassword->assertStatus(422);
        $wrongPassword->assertJsonValidationErrors('email');
        $this->assertGuest('admin');

        // Identical wording regardless of which part was wrong -> no
        // enumeration signal for an attacker.
        $this->assertSame(
            $wrongEmail->json('errors.email.0'),
            $wrongPassword->json('errors.email.0')
        );
    }

    public function test_unauthenticated_request_to_me_is_rejected(): void
    {
        $response = $this->getJson('/api/admin/me');

        $response->assertStatus(401);
    }

    public function test_authenticated_admin_can_fetch_me(): void
    {
        $admin = AdminUser::factory()->create(['email' => 'admin@padel.test']);

        $response = $this->actingAs($admin, 'admin')->getJson('/api/admin/me');

        $response->assertOk();
        $response->assertJsonPath('data.email', 'admin@padel.test');
    }

    public function test_logout_invalidates_the_session(): void
    {
        $admin = AdminUser::factory()->create();

        $this->actingAs($admin, 'admin');
        $this->assertAuthenticatedAs($admin, 'admin');

        $response = $this->postJson('/api/admin/logout');

        $response->assertOk();
        $this->assertGuest('admin');
    }

    public function test_login_is_rate_limited_after_five_attempts_per_minute(): void
    {
        AdminUser::factory()->create(['email' => 'admin@padel.test', 'password' => 'Password123!']);

        $payload = ['email' => 'admin@padel.test', 'password' => 'wrong-password'];

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/admin/login', $payload);
            $response->assertStatus(422);
        }

        $sixthAttempt = $this->postJson('/api/admin/login', $payload);
        $sixthAttempt->assertStatus(429);
    }

    public function test_customer_registration_and_login_endpoints_do_not_exist(): void
    {
        $this->postJson('/api/register')->assertStatus(404);
        $this->postJson('/api/login')->assertStatus(404);
        $this->postJson('/api/customer/login')->assertStatus(404);
        $this->postJson('/api/customer/register')->assertStatus(404);
    }

    public function test_only_admin_user_model_is_used_for_authentication(): void
    {
        $this->assertSame(AdminUser::class, config('auth.providers.admin_users.model'));
        $this->assertSame('admin', config('auth.defaults.guard'));
        $this->assertArrayNotHasKey('users', config('auth.providers'));
        $this->assertArrayNotHasKey('web', config('auth.guards'));

        $admin = AdminUser::factory()->create();
        $this->actingAs($admin, 'admin');

        $this->assertInstanceOf(AdminUser::class, auth('admin')->user());
    }

    public function test_password_never_appears_in_login_or_me_responses(): void
    {
        $admin = AdminUser::factory()->create([
            'email' => 'admin@padel.test',
            'password' => 'Password123!',
        ]);

        $login = $this->postJson('/api/admin/login', [
            'email' => 'admin@padel.test',
            'password' => 'Password123!',
        ]);
        $login->assertOk();
        $this->assertArrayNotHasKey('password', $login->json('data'));
        $this->assertArrayNotHasKey('remember_token', $login->json('data'));
        $this->assertStringNotContainsString($admin->password, $login->getContent());

        $me = $this->actingAs($admin, 'admin')->getJson('/api/admin/me');
        $me->assertOk();
        $this->assertArrayNotHasKey('password', $me->json('data'));
        $this->assertArrayNotHasKey('remember_token', $me->json('data'));
        $this->assertStringNotContainsString($admin->password, $me->getContent());
    }

    /**
     * Step 17 regression test. Every other test in this suite uses
     * getJson()/postJson(), which always send Accept: application/json —
     * exactly like the real frontend's axios client, but NOT like a bare
     * curl request, a direct browser visit to an API URL, or any client
     * that omits the header. Without it, Laravel's default guest-redirect
     * behavior (unauthenticated -> redirect to route('login')) previously
     * threw a RouteNotFoundException — a 500 — since this API-only app has
     * no such named route. See bootstrap/app.php's redirectGuestsTo() and
     * shouldRenderJsonWhen() for the fix.
     */
    public function test_unauthenticated_api_request_without_accept_header_returns_clean_401_not_500(): void
    {
        // Plain get() — deliberately not getJson() — omits Accept: application/json.
        $response = $this->get('/api/admin/bookings');

        $response->assertStatus(401);
        $response->assertHeader('Content-Type', 'application/json');
        $response->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_404_on_unmatched_api_route_without_accept_header_is_json_not_html(): void
    {
        $response = $this->get('/api/this-route-does-not-exist');

        $response->assertStatus(404);
        $response->assertHeader('Content-Type', 'application/json');
    }

    public function test_web_welcome_route_still_renders_html_unaffected_by_the_api_json_fix(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Step 18 (Testing) — live HTTP smoke testing against a running dev
     * server (PHPUnit's VerifyCsrfToken bypass for unit tests means this
     * can't be reproduced through postJson()) showed that a genuine CSRF
     * mismatch — a framework-level exception with no custom render(),
     * unlike this app's own domain exceptions — renders with a full
     * stack trace and absolute server file paths when APP_DEBUG=true,
     * this project's local/dev default. That is standard Laravel
     * behavior gated entirely by config('app.debug'), not an application
     * defect: production deployments must run with APP_DEBUG=false. This
     * locks in that with debug off, the identical exception renders with
     * only a safe message and nothing else.
     */
    public function test_framework_exceptions_never_leak_trace_details_when_debug_is_off(): void
    {
        config(['app.debug' => false]);

        $request = \Illuminate\Http\Request::create('/api/admin/login', 'POST');
        $request->headers->set('Accept', 'application/json');

        $response = app(\Illuminate\Contracts\Debug\ExceptionHandler::class)
            ->render($request, new \Illuminate\Session\TokenMismatchException('CSRF token mismatch.'));

        $data = json_decode($response->getContent(), true);

        $this->assertSame(419, $response->getStatusCode());
        $this->assertSame(['message'], array_keys($data));
        $this->assertSame('CSRF token mismatch.', $data['message']);
    }
}
