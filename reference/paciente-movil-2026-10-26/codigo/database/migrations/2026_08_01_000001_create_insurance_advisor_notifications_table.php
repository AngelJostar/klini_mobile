<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insurance_advisor_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('insurance_policy_id')->constrained()->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('type')->index();
            $table->string('audience')->index();
            $table->string('subject');
            $table->text('body');
            $table->timestamp('occurred_at')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_advisor_notifications');
    }
};
