<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_wallet_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('mode', 8);
            $table->string('currency', 3)->default('MXN');
            $table->string('scope', 32)->default('health_services');
            $table->boolean('blocked')->default(false);
            $table->string('blocked_reason', 64)->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'mode', 'currency', 'scope'], 'mwa_owner_mode_currency_scope_unique');
        });

        Schema::create('mobile_wallet_recharges', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('wallet_account_id')->constrained('mobile_wallet_accounts')->restrictOnDelete();
            $table->uuid('client_request_id');
            $table->unsignedInteger('amount_cents');
            $table->string('status', 32)->default('creating');
            $table->string('stripe_payment_intent_id', 100)->nullable();
            $table->string('stripe_charge_id', 100)->nullable();
            $table->unsignedInteger('refunded_cents')->default(0);
            $table->timestamp('creation_started_at')->nullable();
            $table->timestamps();
            $table->unique(['wallet_account_id', 'client_request_id'], 'mwr_account_client_request_unique');
            $table->unique('stripe_payment_intent_id', 'mwr_payment_intent_unique');
            $table->unique('stripe_charge_id', 'mwr_charge_unique');
        });

        Schema::create('mobile_wallet_movements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('wallet_account_id')->constrained('mobile_wallet_accounts')->restrictOnDelete();
            $table->foreignUuid('recharge_id')->constrained('mobile_wallet_recharges')->restrictOnDelete();
            $table->string('type', 16);
            // Refunds are negative ledger entries; the balance is the signed SQL sum.
            $table->bigInteger('amount_cents');
            $table->string('source_key', 160);
            $table->timestamp('created_at')->useCurrent();
            $table->unique('source_key', 'mwm_source_unique');
            $table->index(['wallet_account_id', 'created_at'], 'mwm_account_created_index');
        });

        Schema::create('mobile_wallet_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->string('mode', 8);
            $table->string('event_id', 100);
            $table->string('event_type', 100);
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->unique(['mode', 'event_id'], 'mwwe_mode_event_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_wallet_webhook_events');
        Schema::dropIfExists('mobile_wallet_movements');
        Schema::dropIfExists('mobile_wallet_recharges');
        Schema::dropIfExists('mobile_wallet_accounts');
    }
};
