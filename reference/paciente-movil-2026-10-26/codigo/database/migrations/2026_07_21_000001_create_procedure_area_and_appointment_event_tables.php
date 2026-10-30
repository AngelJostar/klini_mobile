<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('procedure_areas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('medical_unit_id')->constrained()->cascadeOnDelete();
            $table->string('legacy_id')->nullable()->index();
            $table->string('type')->index();
            $table->string('location')->nullable();
            $table->string('floor')->nullable();
            $table->string('unit_number')->nullable();
            $table->unsignedInteger('simultaneous_capacity')->default(1);
            $table->string('responsible_name')->nullable();
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['medical_unit_id', 'type', 'unit_number']);
        });

        Schema::create('procedure_area_schedules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('procedure_area_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['procedure_area_id', 'day_of_week', 'starts_at', 'ends_at'], 'procedure_area_schedule_unique');
        });

        Schema::table('appointments', function (Blueprint $table): void {
            $table->foreignId('procedure_area_id')
                ->nullable()
                ->after('medical_unit_id')
                ->constrained()
                ->nullOnDelete();
        });

        Schema::create('appointment_status_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status')->nullable()->index();
            $table->string('to_status')->index();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_status_events');

        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('procedure_area_id');
        });

        Schema::dropIfExists('procedure_area_schedules');
        Schema::dropIfExists('procedure_areas');
    }
};
