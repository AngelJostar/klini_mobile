<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacy_store_settings', function (Blueprint $table): void {
            $table->foreignId('klini_provider_id')->nullable()->constrained('providers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pharmacy_store_settings', fn (Blueprint $table) => $table->dropConstrainedForeignId('klini_provider_id'));
    }
};
