<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | The React frontend runs on a different origin than this API (a
    | different port locally, a different Railway domain in production), so
    | every API path needs CORS enabled. Auth is stateless Sanctum bearer
    | tokens carried in an Authorization header — no cookies are sent or
    | read, so there's no CSRF-cookie route to allow and no need for
    | supports_credentials.
    |
    */

    'paths' => ['api/*'],

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

    'supports_credentials' => false,

];
