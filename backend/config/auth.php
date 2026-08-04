<?php

use App\Models\AdminUser;

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | AdminUser is the only authenticatable identity in this system —
    | customers always book as guests. No password-reset broker is
    | configured below: this project has no password-reset feature.
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'admin'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    |
    | 'admin' is a session guard. Sanctum's SPA authentication mode rides on
    | top of it for stateful frontend requests — see config/sanctum.php's
    | 'guard' key, which points Sanctum at this same guard.
    |
    */

    'guards' => [
        'admin' => [
            'driver' => 'session',
            'provider' => 'admin_users',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    */

    'providers' => [
        'admin_users' => [
            'driver' => 'eloquent',
            'model' => env('AUTH_MODEL', AdminUser::class),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    |
    | Here you may define the number of seconds before a password confirmation
    | window expires and users are asked to re-enter their password via the
    | confirmation screen. By default, the timeout lasts for three hours.
    |
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
