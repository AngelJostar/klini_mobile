<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_clinics', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medical_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('color', 20)->nullable();
            $table->string('timezone')->default('America/Mexico_City');
            $table->string('location_type')->default('in_person');
            $table->text('address')->nullable();
            $table->string('status')->default('active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('doctor_availability_rules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_clinic_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('mode')->default('in_person');
            $table->date('recurrence_start');
            $table->date('recurrence_end')->nullable();
            $table->json('selected_months')->nullable();
            $table->string('status')->default('published');
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index(['doctor_id', 'weekday', 'status']);
        });

        Schema::create('doctor_availability_exceptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_clinic_id')->nullable()->constrained()->cascadeOnDelete();
            $table->date('date_start');
            $table->date('date_end');
            $table->string('type');
            $table->boolean('all_day')->default(true);
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('clinical_encounters', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medical_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('procedure_area_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('draft');
            $table->text('reason')->nullable();
            $table->text('symptoms')->nullable();
            $table->json('vital_signs')->nullable();
            $table->json('background')->nullable();
            $table->text('examination')->nullable();
            $table->text('assessment')->nullable();
            $table->text('treatment_plan')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['doctor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_encounters');
        Schema::dropIfExists('doctor_availability_exceptions');
        Schema::dropIfExists('doctor_availability_rules');
        Schema::dropIfExists('doctor_clinics');
    }
};
