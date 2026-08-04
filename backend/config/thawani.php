<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Thawani Sandbox Configuration
    |--------------------------------------------------------------------------
    |
    | The official Stoplight reference (thawani-technologies.stoplight.io)
    | is a JS-rendered SPA that still returns no usable content to this
    | project's fetch tools (developer.thawani.om also 525s, docs.thawani.om
    | 403s/redirects back to the same SPA) — the primary source has never
    | been read directly. The base URL, checkout URL pattern, and
    | 'thawani-api-key' header below are cross-verified against several
    | independent real-world integrations (jkbroot/thawani, a Laravel
    | package; SkroooB/thawani-react; a Thawani UAT credentials tutorial at
    | s4d.om) that all agree with each other and with what was already
    | implemented here. Treat as strongly corroborated, not primary-source
    | confirmed — the real test is a live sandbox call once real keys are
    | supplied. Nothing in app/Services/ThawaniService.php hardcodes a URL,
    | header name, or field name — this file is the single place to correct
    | if a live sandbox response ever disagrees.
    |
    */

    // 'mock' (default for this academic project — no real merchant
    // credentials exist) simulates the entire Thawani checkout flow
    // locally, no network call and no key required. 'real' calls the
    // actual UAT API in config('thawani.base_url') below. Mock mode is
    // additionally gated to local/testing environments regardless of this
    // value — see MockThawaniService::isActive().
    'mode' => env('THAWANI_MODE', 'mock'),

    'base_url' => env('THAWANI_BASE_URL', 'https://uatcheckout.thawani.om/api/v1'),

    'checkout_url' => env('THAWANI_CHECKOUT_URL', 'https://uatcheckout.thawani.om/pay'),

    'secret_key' => env('THAWANI_SECRET_KEY', ''),

    'publishable_key' => env('THAWANI_PUBLISHABLE_KEY', ''),

];
