<?php

// Local staging harness only. No production environment or database is loaded.
$stage = dirname(__DIR__);
$values = [
    'APP_ENV' => 'testing', 'APP_KEY' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'APP_BASE_PATH' => 'C:/laragon/www/dr-sam', 'DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => ':memory:', 'DB_URL' => '',
    'CACHE_STORE' => 'array', 'SESSION_DRIVER' => 'array', 'QUEUE_CONNECTION' => 'sync',
    'APP_CONFIG_CACHE' => $stage.'/harness/runtime/config.php', 'APP_ROUTES_CACHE' => $stage.'/harness/runtime/routes.php',
    'APP_EVENTS_CACHE' => $stage.'/harness/runtime/events.php',
];
foreach ($values as $key => $value) {
    putenv($key.'='.$value); $_ENV[$key] = $value; $_SERVER[$key] = $value;
}
foreach (['storage/framework/views', 'storage/framework/cache', 'storage/framework/sessions', 'storage/logs', 'runtime', 'no-environment'] as $directory) {
    if (!is_dir($stage.'/harness/'.$directory)) mkdir($stage.'/harness/'.$directory, 0777, true);
}
$loader = require 'C:/laragon/www/dr-sam/vendor/autoload.php';
$loader->addPsr4('App\\', $stage.'/app', true);
require __DIR__.'/TestCase.php';
