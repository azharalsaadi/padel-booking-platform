<?php

use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\AdminBookingController;
use App\Http\Controllers\Api\Admin\ClosureController;
use App\Http\Controllers\Api\Admin\CourtController;
use App\Http\Controllers\Api\Admin\CourtWorkingHoursController;
use App\Http\Controllers\Api\Admin\PricingRuleController;
use App\Http\Controllers\Api\Customer\AvailabilityController;
use App\Http\Controllers\Api\Customer\BookingController;
use App\Http\Controllers\Api\Customer\BookingQuoteController;
use App\Http\Controllers\Api\Customer\GuestBookingController;
use App\Http\Controllers\Api\Customer\MockThawaniController;
use App\Http\Controllers\Webhooks\ThawaniWebhookController;
use Illuminate\Support\Facades\Route;

// Public, customer-facing — guests only, no authentication.
Route::get('availability', [AvailabilityController::class, 'index']);

// Rate limited (Step 17): unlike a plain read, these can hold a real slot
// (a Thawani booking reserves a court for THAWANI_HOLD_MINUTES), so
// unauthenticated scripted abuse here degrades availability for everyone.
Route::middleware('throttle:guest-booking-write')->group(function () {
    Route::post('bookings/quote', BookingQuoteController::class);
    Route::post('bookings', [BookingController::class, 'store']);
});

// Guest self-service on an existing booking — identified only by its
// access_token (never an id), no authentication, rate limited per IP.
Route::middleware('throttle:guest-booking')->group(function () {
    Route::get('bookings/{accessToken}', [GuestBookingController::class, 'show']);
    Route::post('bookings/{accessToken}/cancel', [GuestBookingController::class, 'cancel']);
    Route::post('bookings/{accessToken}/retry-payment', [GuestBookingController::class, 'retryPayment']);
    Route::post('bookings/{accessToken}/refresh-payment', [GuestBookingController::class, 'refreshPayment']);
});

// Server-to-server — no auth (Thawani doesn't authenticate as our admin
// or as a customer); idempotency is enforced inside PaymentService.
Route::post('webhooks/thawani', [ThawaniWebhookController::class, 'handle']);

// Local Thawani checkout simulator — this academic project has no real
// merchant credentials, so THAWANI_MODE=mock (local/testing only) routes
// checkout through here instead of the real UAT API. Registered only when
// APP_ENV is local/testing at boot (never present in a production route
// table); the 'thawani.mock' middleware adds a redundant per-request
// check of THAWANI_MODE itself — see MockThawaniService::isActive() and
// MockThawaniController's docblock for why scoping by the unguessable
// mock session id (never a booking id) keeps this from being a generic
// "mark any booking paid" endpoint.
if (in_array(config('app.env'), ['local', 'testing'], true)) {
    Route::middleware('thawani.mock')->prefix('mock-thawani')->group(function () {
        Route::get('{sessionId}', [MockThawaniController::class, 'show']);
        Route::post('{sessionId}/succeed', [MockThawaniController::class, 'succeed']);
        Route::post('{sessionId}/fail', [MockThawaniController::class, 'fail']);
    });
}

Route::prefix('admin')->group(function () {
    Route::post('login', [AdminAuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AdminAuthController::class, 'logout']);
        Route::get('me', [AdminAuthController::class, 'me']);

        Route::apiResource('courts', CourtController::class);
        Route::put('courts/{court}/working-hours', [CourtWorkingHoursController::class, 'update']);

        Route::get('closures', [ClosureController::class, 'index']);
        Route::post('closures', [ClosureController::class, 'store']);
        Route::delete('closures/batch/{batchId}', [ClosureController::class, 'destroyBatch']);
        Route::delete('closures/{closure}', [ClosureController::class, 'destroy']);

        Route::get('pricing-rules', [PricingRuleController::class, 'index']);
        Route::post('pricing-rules', [PricingRuleController::class, 'store']);
        Route::put('pricing-rules/{pricingRule}', [PricingRuleController::class, 'update']);
        Route::delete('pricing-rules/{pricingRule}', [PricingRuleController::class, 'destroy']);

        Route::get('bookings', [AdminBookingController::class, 'index']);
        Route::get('bookings/{booking}', [AdminBookingController::class, 'show']);
        Route::post('bookings/{booking}/mark-paid', [AdminBookingController::class, 'markPaid']);
    });
});
