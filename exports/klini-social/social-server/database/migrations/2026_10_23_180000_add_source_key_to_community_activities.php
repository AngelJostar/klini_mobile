<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('community_activities', function (Blueprint $table) {
            $table->string('source_key')->nullable();
            $table->unique(['user_id', 'source_key']);
        });
    }

    public function down(): void
    {
        Schema::table('community_activities', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'source_key']);
            $table->dropColumn('source_key');
        });
    }
};
