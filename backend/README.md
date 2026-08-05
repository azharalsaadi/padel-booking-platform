## Padel Booking Platform — Local Development

Run this alongside the `frontend` app (see `frontend/README.md`) for the full stack. Steps here get the API itself running; Step 16's integration notes below cover the two talking to each other correctly.

### Requirements

- PHP 8.2 or later, with the extensions Laravel 12 needs by default (`pdo_mysql`, `mbstring`, `openssl`, `curl`, `fileinfo`)
- Composer 2.x
- MySQL 8.x (or MariaDB 10.6+) — see `DB_CONNECTION`/`DB_*` in `.env.example`
- Node.js `^20.19.0 || >=22.12.0` and npm (only needed here for the `composer setup` convenience script, which also builds the frontend — see `frontend/README.md` for frontend-only requirements)

### Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Create two MySQL databases (matching `.env`'s `DB_DATABASE` and the test suite's `padel_booking_test` — see `phpunit.xml`):

```sql
CREATE DATABASE padel_booking;
CREATE DATABASE padel_booking_test;
```

```bash
php artisan migrate --seed        # dev database — demo courts/pricing/admin user
php artisan serve                 # http://localhost:8000
```

Demo admin login (from `AdminUserSeeder`): `admin@padel.test` / `Password123!`.

### Scheduler (optional but recommended)

`bookings:expire-pending` reclaims slots from abandoned Thawani checkouts and is registered to run every minute (`routes/console.php`). Without it, expired holds are only cleared lazily. In a second terminal:

```bash
php artisan schedule:work
```

No queue worker is required — nothing in this app dispatches queued jobs.

### Tests

The automated suite (`php artisan test`) always targets `padel_booking_test` (configured in `phpunit.xml`), never the dev database. To run one-off destructive commands (e.g. `migrate:fresh --seed`) against the test database instead of dev, override the connection inline:

```bash
DB_DATABASE=padel_booking_test php artisan migrate:fresh --seed
```

### Cross-origin session cookies (Sanctum SPA auth)

The frontend (`localhost:5173`) and this API (`localhost:8000`) are different origins with no dev proxy between them. `.env.example` already sets `SESSION_SAME_SITE=none` and `SESSION_SECURE_COOKIE=true`, which is required for the session/XSRF cookies to survive a cross-origin request at all — the framework's `Lax` default is silently dropped by the browser on cross-origin POST/PUT/DELETE. `Secure` works without HTTPS here because browsers treat `localhost`/`127.0.0.1` as secure contexts. If you deploy frontend and backend on the same origin later, this can revert to the framework default.

`FRONTEND_URL` drives both CORS (`config/cors.php`) and, together with `SANCTUM_STATEFUL_DOMAINS`, which origins get stateful cookie auth. It accepts a comma-separated list if you need both `http://localhost:5173` and `http://127.0.0.1:5173`.

### Payment testing (Thawani mock mode)

This project has no real Thawani merchant account, so `.env.example` ships with `THAWANI_MODE=mock` (see `config/thawani.php`, enforced by `App\Http\Middleware\EnsureThawaniMockActive`). With mock mode on:

- Choosing "Pay Online with Thawani" at checkout redirects to a local stand-in checkout page (`/mock-thawani/:sessionId` in the frontend, served by `Api\Customer\MockThawaniController`) instead of Thawani's real hosted UAT checkout.
- That page's "Complete Payment" / "Cancel Payment" buttons simulate a successful or failed payment, applying the exact same status-transition logic (`PaymentService::applyVerifiedStatus`) a real Thawani webhook would trigger.
- "Pay at Venue" bookings are unaffected either way — they're confirmed immediately and marked paid later from the admin panel (`Admin > Bookings > Mark as Paid`), never touching Thawani at all.

To test against Thawani's real UAT sandbox instead, set `THAWANI_MODE=live` and fill in `THAWANI_SECRET_KEY`/`THAWANI_PUBLISHABLE_KEY` from your own Thawani merchant dashboard (Settings → Developers → Create Key) — never commit real keys.

### Troubleshooting

- **"CSRF token mismatch" / admin login silently fails**: usually a stale or missing session cookie. Confirm `FRONTEND_URL` and `SANCTUM_STATEFUL_DOMAINS` in `.env` list the exact origin the frontend is running on (including port), and that `SESSION_SAME_SITE=none` / `SESSION_SECURE_COOKIE=true` are set as shipped in `.env.example` — see the cross-origin cookie notes above.
- **`SQLSTATE[HY000] [2002] ... refused it` on `migrate`**: MySQL isn't running, or `DB_HOST`/`DB_PORT`/`DB_DATABASE` in `.env` don't match a database you actually created — see Setup above.
- **`php artisan test` fails with a missing-table/connection error**: the `padel_booking_test` database (see Tests above) doesn't exist yet, or `phpunit.xml`'s `DB_DATABASE` override doesn't match what you created.
- **Booking stays "Pending" on Thawani checkout, or a payment hold never expires**: the scheduler (`php artisan schedule:work`) isn't running — see the Scheduler section above.
- **Port already in use** (`8000` for `php artisan serve` or `5173` for the frontend): stop whatever else is bound to that port, or pass `--port=` to `artisan serve` (and update `FRONTEND_URL`/`VITE_API_BASE_URL` to match).

<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
