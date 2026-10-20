<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messenger_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('legacy_id')->nullable()->unique();
            $table->string('phone')->nullable();
            $table->string('vehicle')->nullable();
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('delivery_routes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('messenger_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('provider_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('route_code')->nullable()->unique();
            $table->string('origin')->nullable();
            $table->string('destination')->nullable();
            $table->string('status')->default('planned')->index();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('delivery_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('delivery_route_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->index();
            $table->text('notes')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('reported_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('platform_modules', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->string('target')->nullable();
            $table->boolean('enabled')->default(true)->index();
            $table->json('roles')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('legacy_payloads', function (Blueprint $table): void {
            $table->id();
            $table->string('source_key')->index();
            $table->string('legacy_id')->nullable()->index();
            $table->string('entity_type')->nullable()->index();
            $table->json('payload');
            $table->timestamp('imported_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event')->index();
            $table->string('auditable_type')->nullable()->index();
            $table->unsignedBigInteger('auditable_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('legacy_payloads');
        Schema::dropIfExists('platform_modules');
        Schema::dropIfExists('delivery_reports');
        Schema::dropIfExists('delivery_routes');
        Schema::dropIfExists('messenger_profiles');
    }
};

