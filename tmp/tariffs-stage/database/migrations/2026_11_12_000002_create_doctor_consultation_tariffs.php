<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_consultation_tariffs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_id')->constrained('doctors')->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->string('modality', 20)->default('in_person');
            $table->string('currency', 3)->default('MXN');
            $table->unsignedInteger('amount_cents');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['doctor_id', 'modality', 'version'], 'dct_doctor_modality_version_unique');
        });

        Schema::table('doctors', function (Blueprint $table): void {
            $table->foreignId('current_consultation_tariff_id')->nullable()
                ->constrained('doctor_consultation_tariffs')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('current_consultation_tariff_id');
        });
        Schema::dropIfExists('doctor_consultation_tariffs');
    }
};
