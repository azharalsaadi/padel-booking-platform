<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | The React frontend runs on a different origin (port) than this API
    | during development, so every API path plus Sanctum's CSRF-cookie
    | route need CORS enabled with credentials support for the session
    | cookie to be sent/received correctly.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(explode(',', (string) env('FRONTEND_URL', 'http://localhost:5173'))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    // Content-Disposition isn't on the CORS "safelisted" response-header
    // list, so without this the booking PDF download's filename is
    // invisible to frontend JS (axios reads response.headers) even though
    // the browser itself receives it fine — it must be explicitly exposed.
    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => true,

];
