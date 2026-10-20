<?php

return [
    'allowed_roles' => [
        'patient',
        'doctor',
    ],

    'token_expiration_days' => (int) env('MOBILE_API_TOKEN_EXPIRATION_DAYS', 30),
];
