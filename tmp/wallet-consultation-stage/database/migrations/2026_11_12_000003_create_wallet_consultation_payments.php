<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_wallet_consultation_quotes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('wallet_account_id')->constrained('mobile_wallet_accounts')->restrictOnDelete();
            $table->foreignId('appointment_id')->constrained('appointments')->restrictOnDelete();
            $table->foreignId('doctor_id')->constrained('doctors')->restrictOnDelete();
            $table->foreignId('tariff_id')->constrained('doctor_consultation_tariffs')->restrictOnDelete();
            $table->unsignedInteger('tariff_version');
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 3)->default('MXN');
            $table->string('scope', 32)->default('health_services');
            $table->string('mode', 8);
            $table->char('appointment_fingerprint', 64);
            $table->dateTime('expires_at');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['wallet_account_id', 'appointment_id', 'expires_at'], 'mwcq_account_appointment_expiry_index');
        });

        Schema::create('mobile_wallet_service_payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('wallet_account_id')->constrained('mobile_wallet_accounts')->restrictOnDelete();
            $table->foreignId('appointment_id')->constrained('appointments')->restrictOnDelete();
            $table->foreignUuid('quote_id')->unique('mwsp_quote_unique')->constrained('mobile_wallet_consultation_quotes')->restrictOnDelete();
            $table->uuid('client_request_id');
            $table->unsignedInteger('amount_cents');
            $table->string('mode', 8);
            $table->string('currency', 3)->default('MXN');
            $table->string('scope', 32)->default('health_services');
            $table->string('status', 16)->default('paid');
            $table->dateTime('paid_at');
            $table->dateTime('reversed_at')->nullable();
            $table->timestamps();
            $table->unique(['appointment_id', 'mode'], 'mwsp_appointment_mode_unique');
            $table->unique(['wallet_account_id', 'client_request_id'], 'mwsp_account_client_request_unique');
        });

        Schema::table('mobile_wallet_movements', function (Blueprint $table): void {
            // Preserve the existing recharge foreign key while allowing service-origin entries.
            $table->uuid('recharge_id')->nullable()->change();
            $table->foreignUuid('service_payment_id')->nullable()->constrained('mobile_wallet_service_payments')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        // A rollback must not remove the origin of an existing financial movement.
        if (DB::table('mobile_wallet_service_payments')->exists()
            || DB::table('mobile_wallet_movements')->whereNotNull('service_payment_id')->orWhereNull('recharge_id')->exists()) {
            throw new RuntimeException('Consultation payments require manual review before rolling back this migration.');
        }

        Schema::table('mobile_wallet_movements', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('service_payment_id');
        });
        Schema::table('mobile_wallet_movements', function (Blueprint $table): void {
            $table->uuid('recharge_id')->nullable(false)->change();
        });
        Schema::dropIfExists('mobile_wallet_service_payments');
        Schema::dropIfExists('mobile_wallet_consultation_quotes');
    }
};
