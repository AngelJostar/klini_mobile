<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_stories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('photo_path');
            $table->string('avatar_path')->nullable();
            $table->string('photo_mime', 40);
            $table->timestamp('expires_at')->index();
            $table->timestamps();
            $table->index(['patient_id', 'expires_at']);
        });
        Schema::create('patient_story_views', function (Blueprint $table) {
            $table->foreignId('patient_story_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->timestamp('viewed_at');
            $table->primary(['patient_story_id', 'patient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_story_views');
        Schema::dropIfExists('patient_stories');
    }
};
