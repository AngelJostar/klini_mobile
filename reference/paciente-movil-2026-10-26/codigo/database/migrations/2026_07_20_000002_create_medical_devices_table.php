<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_devices', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('category');
            $table->string('manufacturer');
            $table->string('model')->nullable();
            $table->string('connectivity')->nullable();
            $table->string('linked_module')->nullable();
            $table->string('recorded_data', 500)->nullable();
            $table->string('compatibility')->nullable();
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_devices');
    }
};
