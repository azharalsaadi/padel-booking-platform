## Padel Booking Platform — Local Development

Run this alongside the `frontend` app (see `frontend/README.md`) for the full stack. Steps here get the API itself running; Step 16's integration notes below cover the two talking to each other correctly.

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
