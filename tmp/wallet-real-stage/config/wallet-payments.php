<?php

return [
    // Configuration alone never opts the application into collecting live funds.
    'enabled' => (bool) env('WALLET_PAYMENTS_ENABLED', false),
    'live_enabled' => (bool) env('WALLET_PAYMENTS_LIVE_ENABLED', false),
    'service_redemption_enabled' => (bool) env('WALLET_SERVICE_REDEMPTION_ENABLED', false),
    'mode' => env('WALLET_PAYMENTS_MODE', 'test'),
    'secret_key' => env('STRIPE_SECRET_KEY'),
    'publishable_key' => env('STRIPE_PUBLISHABLE_KEY'),
    'webhook_secret' => env('STRIPE_WALLET_WEBHOOK_SECRET'),
    'account_id' => env('STRIPE_ACCOUNT_ID'),
    'merchant_identifier' => env('APPLE_PAY_MERCHANT_IDENTIFIER'),
    'api_version' => '2026-10-28.endive',
];
