<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('account_category', 24)->default('operational')->index();
            $table->string('klini_member_id', 32)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['klini_member_id']);
            $table->dropIndex(['account_category']);
            $table->dropColumn(['account_category', 'klini_member_id']);
        });
    }
};
