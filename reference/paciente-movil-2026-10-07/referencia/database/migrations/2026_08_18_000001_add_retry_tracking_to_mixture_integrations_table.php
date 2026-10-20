<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mixture_integrations', function (Blueprint $table): void {
            $table->unsignedSmallInteger('sync_attempts')->default(0)->after('last_error');
            $table->timestamp('next_retry_at')->nullable()->after('last_synced_at')->index();
        });
    }

    public function down(): void
    {
        Schema::table('mixture_integrations', function (Blueprint $table): void {
            $table->dropIndex(['next_retry_at']);
            $table->dropColumn(['sync_attempts', 'next_retry_at']);
        });
    }
};
