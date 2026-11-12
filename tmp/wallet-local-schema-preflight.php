<?php

require 'C:/laragon/www/dr-sam/vendor/autoload.php';
$app = require 'C:/laragon/www/dr-sam/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
    $name = config('database.default');
    $connection = config('database.connections.'.$name);
    $local = in_array($connection['host'] ?? '', ['127.0.0.1', 'localhost', '::1'], true)
        && ($connection['database'] ?? '') === 'dr_sam'
        && in_array($connection['driver'] ?? '', ['mysql', 'mariadb'], true);
    if (!$local) {
        echo json_encode(['local_demo_database_verified' => false]);
        exit(1);
    }
    $schema = Illuminate\Support\Facades\Schema::getFacadeRoot();
    $tables = ['mobile_wallet_accounts', 'mobile_wallet_recharges', 'mobile_wallet_movements', 'mobile_wallet_webhook_events'];
    $flagsDisabled = config('wallet-payments.enabled') === false
        && config('wallet-payments.live_enabled') === false
        && config('wallet-payments.service_redemption_enabled') === false;
    $action = $argv[1] ?? '';
    if (in_array($action, ['--pretend', '--apply'], true)) {
        if (!$flagsDisabled || !$schema->hasTable('migrations') || array_filter($tables, fn ($table) => $schema->hasTable($table))) {
            echo json_encode(['migration_permitted' => false]);
            exit(1);
        }
        $arguments = ['--path' => 'database/migrations/2026_11_12_000001_create_mobile_wallet_tables.php', '--force' => true];
        if ($action === '--pretend') $arguments['--pretend'] = true;
        $status = Illuminate\Support\Facades\Artisan::call('migrate', $arguments);
        echo Illuminate\Support\Facades\Artisan::output();
        if ($status !== 0) exit($status);
    }
    echo json_encode(['local_demo_database_verified' => true,
        'tables' => array_combine($tables, array_map(fn ($table) => $schema->hasTable($table), $tables)),
        'collection_disabled' => config('wallet-payments.enabled') === false,
        'live_disabled' => config('wallet-payments.live_enabled') === false,
        'redemption_disabled' => config('wallet-payments.service_redemption_enabled') === false,
    ], JSON_PRETTY_PRINT);
} catch (Throwable) {
    echo json_encode(['local_demo_database_verified' => false, 'error' => 'schema_check_failed']);
    exit(1);
}
