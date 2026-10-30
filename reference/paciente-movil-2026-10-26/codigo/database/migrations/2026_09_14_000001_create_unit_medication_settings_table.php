<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unit_medication_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('medical_unit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medication_catalog_item_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['medical_unit_id', 'medication_catalog_item_id'], 'unit_medication_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_medication_settings');
    }
};
