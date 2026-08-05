# Rally — Padel Booking Platform

A full-stack padel-court booking platform: a **Laravel 12** API (`backend/`) and a **React 19 + TypeScript + Vite** customer/admin frontend (`frontend/`). Built as an academic capstone project.

- **Customers** can browse court availability, book one or more time slots, pay via Thawani (sandboxed in mock mode by default) or at the venue, view/cancel bookings by reference, download a booking-confirmation PDF, and use the site fully in English or Arabic (RTL).
- **Admins** log in to manage courts, working hours, closures, hourly/duration-based pricing rules, and bookings (including marking Pay at Venue bookings as paid) — also fully bilingual.

## Table of contents

- [Features](#features)
- [Technologies used](#technologies-used)
- [Requirements](#requirements)
- [Installation steps](#installation-steps)
- [Backend setup](#backend-setup)
- [Frontend setup](#frontend-setup)
- [Database setup](#database-setup)
- [Environment variables](#environment-variables)
- [Migration and seeding commands](#migration-and-seeding-commands)
- [Admin login](#admin-login)
- [Thawani mock-payment setup](#thawani-mock-payment-setup)
- [Arabic / English support](#arabic--english-support)
- [How to run tests](#how-to-run-tests)
- [How to build for production](#how-to-build-for-production)
- [Troubleshooting](#troubleshooting)
- [Repository layout](#repository-layout)
- [GitHub repository](#github-repository)
- [Live demo](#live-demo)

## Features

**Customer-facing**
- Browse real-time court availability by date, with per-slot pricing computed from admin-configured pricing rules.
- Multi-slot booking in a single reservation, as a guest (no account required) — identified afterwards by a booking reference + access token.
- Pay online via Thawani (sandboxed; a mock mode simulates the full checkout flow with no external network calls) or choose Pay at Venue.
- View, cancel, and download a PDF confirmation of a booking using its reference.
- Pay at Venue bookings that are still pending automatically pick up the "Paid" status in the background once staff mark them as paid — no manual page refresh needed.
- Full English/Arabic UI, including right-to-left (RTL) layout in Arabic — independent of the admin panel's own language setting.

**Admin-facing**
- Session-based admin login (Laravel Sanctum, SPA cookie authentication).
- Manage courts, each court's weekly working hours, and one-off closures.
- Configure pricing rules (hourly or duration-based, per court/day/time window).
- View, filter, and manage all bookings; mark Pay at Venue bookings as paid; cancel bookings.
- Independent English/Arabic toggle from the customer site.

**Platform-level**
- Random, transactional court allocation among currently available courts at confirmation time (no fixed/first-match court, no double-booking).
- Pending, unpaid bookings automatically expire after a configurable hold window, freeing the slot.
- Rate limiting on public/availability endpoints.

## Technologies used

**Backend**
- PHP 8.2, Laravel 12
- MySQL 8
- Laravel Sanctum (SPA session authentication)
- barryvdh/laravel-dompdf (booking PDF export)
- PHPUnit (`php artisan test`)

**Frontend**
- React 19 + TypeScript, Vite 8
- Tailwind CSS v4
- TanStack Query v5 (server state, caching, polling)
- React Router
- react-i18next / i18next (EN/AR, RTL)
- Zustand
- Vitest + Testing Library (unit/integration tests)
- oxlint (linting)

## Requirements

- **PHP** `^8.2` with the extensions Laravel 12 needs by default (`ext-mbstring`, `ext-pdo`, `ext-openssl`, `ext-tokenizer`, `ext-xml`, `ext-ctype`, `ext-json`, `ext-bcmath`, `ext-fileinfo` — all enabled by default in typical PHP installs).
- **Composer 2.x**
- **Node.js** `^20.19.0` or `>=22.12.0` (required by Vite 8), with npm
- **MySQL 8.x** (or compatible), with two databases: one for development, one for the test suite
- Git

## Installation steps

```bash
git clone <this-repository-url>
cd padel-booking-platform
```

Then set up the backend and frontend as described below. Run the backend first, since the frontend expects it at `http://localhost:8000`.

## Backend setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` and set your MySQL credentials (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) — see [Database setup](#database-setup) and [Environment variables](#environment-variables) below. Then:

```bash
php artisan migrate --seed
php artisan serve
```

The API is now running at `http://localhost:8000`. See [`backend/README.md`](backend/README.md) for more detail on the backend specifically.

## Frontend setup

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The site is now running at `http://localhost:5173` and talks to the backend over HTTP/CORS as configured by `SANCTUM_STATEFUL_DOMAINS` and `FRONTEND_URL` in `backend/.env`. See [`frontend/README.md`](frontend/README.md) for more detail on the frontend specifically.

## Database setup

1. Create two MySQL databases (names are examples — match whatever you put in your `.env` files):
   ```sql
   CREATE DATABASE padel_booking;
   CREATE DATABASE padel_booking_test;
   ```
   The first is used by the app (`backend/.env` → `DB_DATABASE`); the second is used only by the backend test suite (configured in `backend/phpunit.xml`), keeping test runs from touching your development data.
2. Run migrations against the dev database, with demo data:
   ```bash
   cd backend
   php artisan migrate --seed
   ```
3. The test database is migrated automatically by PHPUnit/`RefreshDatabase` when you run `php artisan test` — no manual step needed, as long as `padel_booking_test` exists and is reachable.

## Environment variables

### Backend (`backend/.env`, from `backend/.env.example`)

| Variable | Purpose |
| --- | --- |
| `APP_NAME`, `APP_ENV`, `APP_KEY`, `APP_DEBUG`, `APP_URL`, `APP_TIMEZONE` | Standard Laravel app config. `APP_KEY` is generated by `php artisan key:generate`. |
| `FRONTEND_URL` | The SPA's origin (`http://localhost:5173` in dev) — used for CORS/redirects. |
| `SANCTUM_STATEFUL_DOMAINS` | Domains allowed to authenticate via Sanctum's SPA cookie flow — must include the frontend's host:port. |
| `THAWANI_HOLD_MINUTES` | Minutes a pending, unpaid booking holds its slot before it automatically expires. |
| `THAWANI_MODE` | `mock` (default — simulates checkout locally, no network call, no keys needed) or `real` (calls the actual Thawani UAT sandbox API). |
| `THAWANI_BASE_URL`, `THAWANI_CHECKOUT_URL`, `THAWANI_SECRET_KEY`, `THAWANI_PUBLISHABLE_KEY` | Only needed when `THAWANI_MODE=real`; get sandbox keys from a Thawani merchant dashboard. Never commit real keys. |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | MySQL connection for the app database. |
| `SESSION_DRIVER`, `SESSION_LIFETIME`, `SESSION_SAME_SITE`, `SESSION_SECURE_COOKIE` | Session config for Sanctum's cross-origin cookie auth between the SPA and the API. |
| `MAIL_*`, `AWS_*`, `REDIS_*`, `QUEUE_CONNECTION`, `CACHE_STORE` | Standard Laravel service config; defaults (log mailer, database queue/cache) work out of the box for local dev and don't require these services to be running. |

Full reference: [`backend/.env.example`](backend/.env.example).

### Frontend (`frontend/.env`, from `frontend/.env.example`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend API, e.g. `http://localhost:8000/api`. |

Full reference: [`frontend/.env.example`](frontend/.env.example).

## Migration and seeding commands

Run from `backend/`:

```bash
php artisan migrate            # run pending migrations
php artisan migrate:fresh      # drop all tables and re-run migrations
php artisan db:seed            # seed demo data (admin user, courts, pricing rules, closures, sample bookings)
php artisan migrate --seed     # both in one step (recommended for first-time setup)
php artisan migrate:fresh --seed   # reset the database and reseed from scratch
```

Seeders run in this order (see [`backend/database/seeders/DatabaseSeeder.php`](backend/database/seeders/DatabaseSeeder.php)): `AdminUserSeeder` → `CourtSeeder` → `PricingRuleSeeder` → `CourtClosureSeeder` → `BookingSeeder`.

## Admin login

After seeding, sign in to the admin panel at `http://localhost:5173/admin/login` with:

```
Email:    admin@padel.test
Password: Password123!
```

Defined in [`backend/database/seeders/AdminUserSeeder.php`](backend/database/seeders/AdminUserSeeder.php). Change or remove this account before any real deployment.

## Thawani mock-payment setup

By default `backend/.env` has `THAWANI_MODE=mock`, which is what you want for local development and demoing — it requires **no API keys and makes no external network calls**:

1. Start a booking and choose "Pay online" at checkout.
2. You're taken to a local mock checkout page (`/mock-thawani-checkout`, `MockThawaniCheckoutPage.tsx`) that mimics Thawani's hosted checkout.
3. Click **Complete Payment** to simulate a successful payment (booking becomes confirmed + paid, a court is randomly assigned), or **Cancel Payment** to simulate a failed/cancelled payment (redirects to the Payment Failed page).

To instead exercise the real Thawani UAT sandbox, set `THAWANI_MODE=real` and fill in `THAWANI_SECRET_KEY` / `THAWANI_PUBLISHABLE_KEY` with sandbox credentials from your own Thawani merchant dashboard (Settings → Developers → Create Key). This is optional and not required to run or evaluate the project.

## Arabic / English support

Both the customer site and the admin panel have their own independent language toggle (EN/AR), each persisted separately in `localStorage` — switching the admin panel's language does not affect the customer site and vice versa. Arabic renders the full layout right-to-left (RTL), not just translated text. Translation strings live in `frontend/src/i18n/locales/en.json` and `ar.json`.

## How to run tests

**Backend** (from `backend/`), runs against the separate `padel_booking_test` database configured in `phpunit.xml`:

```bash
php artisan test
```

**Frontend** (from `frontend/`), fully mocked at the HTTP layer — no backend needs to be running:

```bash
npm test          # vitest run — single pass, CI-style
npm run test:watch   # vitest — watch mode
```

**Type checking and linting** (from `frontend/`):

```bash
npx tsc --noEmit   # TypeScript, no output
npm run lint       # oxlint
```

## How to build for production

**Frontend** (from `frontend/`):

```bash
npm run build     # tsc -b && vite build — output in frontend/dist/
npm run preview   # serve the production build locally to sanity-check it
```

**Backend**: no separate build step — deploy the PHP source with Composer's production flags and run migrations:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

Set `APP_ENV=production` and `APP_DEBUG=false` in the deployed `.env`, and generate a fresh `APP_KEY` for that environment if one hasn't already been set.

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Frontend requests fail with a CORS or CSRF error | `SANCTUM_STATEFUL_DOMAINS` and `FRONTEND_URL` in `backend/.env` must match the frontend's actual origin (`localhost:5173` by default). Restart `php artisan serve` after changing `.env`. |
| Admin login succeeds but subsequent API calls return 401 | Sanctum's SPA auth needs the CSRF cookie fetched first — make sure you're hitting the app through the frontend (not calling the API directly without the cookie step), and that `SESSION_DOMAIN`/`SESSION_SAME_SITE` weren't changed away from the `.env.example` defaults. |
| `php artisan migrate` fails to connect | Confirm MySQL is running and `DB_HOST`/`DB_PORT`/`DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD` in `backend/.env` are correct, and that the database named in `DB_DATABASE` actually exists (Laravel doesn't create it for you). |
| `php artisan test` fails to connect / wrong data affected | Make sure the `padel_booking_test` database exists and your test DB credentials in `backend/phpunit.xml` (or `.env.testing` if you add one) point at it, not your dev database. |
| `npm run dev` starts but the page can't reach the API | Check `VITE_API_BASE_URL` in `frontend/.env` points at the running backend, and that the backend is actually up. |
| Thawani checkout doesn't behave as expected | Confirm `THAWANI_MODE=mock` in `backend/.env` unless you deliberately configured real sandbox keys — mock mode is what the mock checkout page expects. |
| Node/Vite refuses to start | Vite 8 requires Node `^20.19.0` or `>=22.12.0` — check with `node -v`. |
| A booking PDF fails to generate | Confirm `barryvdh/laravel-dompdf` is installed (`composer install` should have pulled it) and the `storage/` directory is writable. |

## Repository layout

```
backend/             Laravel 12 API (bookings, payments, admin panel backend)
frontend/            React 19 + TypeScript + Vite (customer site + admin panel)
design-references/   Reference screenshots the UI was matched against
```

## GitHub repository

This project is prepared for a public GitHub repository. Before pushing:
- No `.env` files, credentials, API keys, or database dumps are tracked (verified — see each app's `.gitignore`).
- `node_modules/`, `vendor/`, build output (`frontend/dist/`), logs, and caches are all excluded.
- Replace the placeholder above (`git clone <this-repository-url>`) with the real repository URL once it exists on GitHub.

## Live demo

_No live demo is currently deployed. This section is a placeholder — add a link here once the project is hosted._
