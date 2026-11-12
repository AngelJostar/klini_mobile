<?php

namespace Tests;

abstract class TestCase extends \Illuminate\Foundation\Testing\TestCase
{
    public function createApplication()
    {
        $stage = dirname(__DIR__);
        $app = require 'C:/laragon/www/dr-sam/bootstrap/app.php';
        $app->useEnvironmentPath($stage.'/harness/no-environment');
        $app->useStoragePath($stage.'/harness/storage');
        $app->afterResolving('migrator', fn ($migrator) => $migrator->path($stage.'/database/migrations'));
        $app->booted(function () use ($stage) {
            \Illuminate\Support\Facades\View::getFinder()->prependLocation($stage.'/resources/views');
            \Illuminate\Support\Facades\Route::middleware('web')->group($stage.'/routes/web.php');
        });
        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \RuntimeException('Staging refuses any database other than SQLite in memory.');
        }
        return $app;
    }
}
