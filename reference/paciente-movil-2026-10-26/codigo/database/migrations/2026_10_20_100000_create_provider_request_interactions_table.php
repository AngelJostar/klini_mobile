<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_request_interactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20);
            $table->text('body');
            $table->string('status', 20)->nullable();
            $table->text('resolution')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['provider_request_id', 'type', 'status'], 'request_interactions_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_request_interactions');
    }
};
