<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_activities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('community_key');
            $t->string('community_name');
            $t->string('kind', 20);
            $t->string('title');
            $t->text('description')->nullable();
            $t->string('image', 2048)->nullable();
            $t->dateTime('starts_at');
            $t->string('timezone')->default('America/Mexico_City');
            $t->decimal('cost', 10, 2)->default(0);
            $t->unsignedInteger('capacity')->nullable();
            $t->boolean('published')->default(false)->index();
            $t->timestamps();
        });
        Schema::create('community_activity_reservations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('activity_id')->constrained('community_activities')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['activity_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_activity_reservations');
        Schema::dropIfExists('community_activities');
    }
};
