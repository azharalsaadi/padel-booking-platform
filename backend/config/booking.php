<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Thawani Hold Duration
    |--------------------------------------------------------------------------
    |
    | How long (in minutes) a booking's slots stay reserved while awaiting
    | Thawani payment completion before the hold is considered expired.
    | Pay-at-venue bookings never use this (they confirm immediately).
    |
    */

    'thawani_hold_minutes' => (int) env('THAWANI_HOLD_MINUTES', 10),

];
