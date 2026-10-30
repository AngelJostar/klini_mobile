<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_profile_relationship_types', function (Blueprint $table): void {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('requires_administrator')->default(true);
            $table->boolean('allows_independent_login')->default(false);
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        DB::table('patient_profile_relationship_types')->insert([
            [
                'code' => 'administrator',
                'name' => 'Administrador',
                'description' => 'Perfil titular que accede y administra perfiles vinculados.',
                'requires_administrator' => false,
                'allows_independent_login' => true,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'child',
                'name' => 'Menor de edad',
                'description' => 'Perfil administrado por un titular responsable.',
                'requires_administrator' => true,
                'allows_independent_login' => false,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'pet',
                'name' => 'Mascota',
                'description' => 'Perfil de mascota administrado por un titular responsable.',
                'requires_administrator' => true,
                'allows_independent_login' => false,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'family',
                'name' => 'Familiar',
                'description' => 'Perfil familiar administrado por un titular responsable.',
                'requires_administrator' => true,
                'allows_independent_login' => false,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        Schema::create('patient_profile_relationships', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('administrator_patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('managed_patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('relationship_type_id')->constrained('patient_profile_relationship_types')->restrictOnDelete();
            $table->foreignId('access_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('active')->index();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->json('permissions')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                ['administrator_patient_id', 'managed_patient_id'],
                'patient_profile_relationships_unique_pair'
            );
            $table->index(
                ['administrator_patient_id', 'status'],
                'patient_profile_relationships_admin_status_index'
            );
            $table->index(
                ['managed_patient_id', 'status'],
                'patient_profile_relationships_managed_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_profile_relationships');
        Schema::dropIfExists('patient_profile_relationship_types');
    }
};
