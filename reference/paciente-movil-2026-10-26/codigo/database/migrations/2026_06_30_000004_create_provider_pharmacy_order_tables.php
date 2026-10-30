<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('providers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('provider_type')->index();
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('provider_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('medical_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('legacy_id')->nullable()->unique();
            $table->string('request_type')->index();
            $table->string('status')->default('draft')->index();
            $table->timestamp('requested_at')->nullable()->index();
            $table->timestamp('required_at')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
        });

        Schema::create('provider_request_status_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_request_id')->constrained()->cascadeOnDelete();
            $table->string('status')->index();
            $table->string('actor')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('occurred_at')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('medication_catalog_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->nullable()->constrained()->nullOnDelete();
            $table->string('legacy_id')->nullable()->unique();
            $table->string('cnis')->nullable()->index();
            $table->string('name')->index();
            $table->string('generic_name')->nullable()->index();
            $table->string('therapeutic_group')->nullable();
            $table->text('description')->nullable();
            $table->string('presentation')->nullable();
            $table->boolean('requires_prescription')->default(false);
            $table->boolean('controlled')->default(false);
            $table->boolean('cold_chain')->default(false);
            $table->boolean('sector_health')->default(false);
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('pharmacy_products', function (Blueprint $table): void {
            $table->id();
            $table->string('legacy_id')->nullable()->unique();
            $table->string('cnis')->nullable()->index();
            $table->string('name')->index();
            $table->string('generic_name')->nullable()->index();
            $table->string('commercial_name')->nullable();
            $table->string('dose')->nullable();
            $table->string('unit')->nullable();
            $table->string('dosage_form')->nullable();
            $table->string('presentation')->nullable();
            $table->string('laboratory')->nullable();
            $table->string('supplier')->nullable();
            $table->string('barcode')->nullable()->index();
            $table->string('cofepris')->nullable();
            $table->string('sanitary_registry')->nullable();
            $table->boolean('requires_prescription')->default(false);
            $table->boolean('controlled')->default(false);
            $table->boolean('cold_chain')->default(false);
            $table->boolean('sector_health')->default(false);
            $table->decimal('price', 12, 2)->default(0);
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('pharmacy_product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medical_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('warehouse')->nullable()->index();
            $table->string('lot')->nullable()->index();
            $table->unsignedInteger('quantity')->default(0);
            $table->date('expires_at')->nullable();
            $table->string('status')->default('available')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('patient_orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->string('legacy_id')->nullable()->unique();
            $table->string('order_number')->nullable()->unique();
            $table->string('channel')->default('digital');
            $table->string('status')->default('created')->index();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->timestamp('ordered_at')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('patient_order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pharmacy_product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_order_items');
        Schema::dropIfExists('patient_orders');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('pharmacy_products');
        Schema::dropIfExists('medication_catalog_items');
        Schema::dropIfExists('provider_request_status_events');
        Schema::dropIfExists('provider_requests');
        Schema::dropIfExists('providers');
    }
};

