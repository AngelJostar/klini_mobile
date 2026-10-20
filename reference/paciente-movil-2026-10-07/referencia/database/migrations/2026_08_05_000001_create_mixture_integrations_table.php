<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mixture_integrations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_request_id')->unique()->constrained()->cascadeOnDelete();
            $table->uuid('local_external_id')->unique();
            $table->string('cbta_request_id', 100)->nullable()->unique();
            $table->string('remote_status', 50)->nullable()->index();
            $table->string('sync_status', 30)->default('pending')->index();
            $table->string('catalog_version')->nullable();
            $table->string('payload_hash', 64)->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mixture_integrations');
    }
};
