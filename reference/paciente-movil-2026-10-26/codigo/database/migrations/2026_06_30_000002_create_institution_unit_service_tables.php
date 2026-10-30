<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('institutions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('legacy_id')->nullable()->unique();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('type')->default('institution');
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('medical_units', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->nullable()->constrained()->nullOnDelete();
            $table->string('legacy_id')->nullable()->unique();
            $table->string('code')->nullable()->index();
            $table->string('clues')->nullable()->index();
            $table->string('name');
            $table->string('city')->nullable();
            $table->string('municipality')->nullable()->index();
            $table->string('state')->nullable()->index();
            $table->string('entity')->nullable();
            $table->string('type')->nullable();
            $table->string('typology')->nullable();
            $table->string('care_level')->nullable();
            $table->text('address')->nullable();
            $table->decimal('latitude', 11, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->unsignedInteger('beds')->default(0);
            $table->string('contact')->nullable();
            $table->string('unit_username')->nullable();
            $table->string('status')->default('active')->index();
            $table->json('partidas')->nullable();
            $table->json('subpartidas')->nullable();
            $table->json('source_sheets')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('services', function (Blueprint $table): void {
            $table->id();
            $table->string('legacy_id')->nullable()->unique();
            $table->string('category')->nullable()->index();
            $table->string('specialty')->nullable()->index();
            $table->string('name');
            $table->string('code')->nullable()->index();
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('contracted_services', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('medical_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->string('contract_number')->nullable();
            $table->string('status')->default('active')->index();
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('operational_areas', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->string('role_label')->nullable();
            $table->json('default_permissions')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('operational_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medical_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('operational_area_id')->nullable()->constrained()->nullOnDelete();
            $table->string('role_label')->nullable();
            $table->string('status')->default('active')->index();
            $table->json('permissions')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operational_profiles');
        Schema::dropIfExists('operational_areas');
        Schema::dropIfExists('contracted_services');
        Schema::dropIfExists('services');
        Schema::dropIfExists('medical_units');
        Schema::dropIfExists('institutions');
    }
};

