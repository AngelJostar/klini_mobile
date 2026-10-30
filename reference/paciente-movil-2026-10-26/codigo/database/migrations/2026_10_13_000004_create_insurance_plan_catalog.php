<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('insurance_plans', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('insurance_carrier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category', 20)->index();
            $table->string('name', 180);
            $table->decimal('monthly_premium', 12, 2)->nullable();
            $table->decimal('insured_amount', 15, 2)->nullable();
            $table->decimal('deductible', 12, 2)->nullable();
            $table->decimal('coinsurance', 5, 2)->nullable();
            $table->string('status', 20)->default('active')->index();
            $table->boolean('is_linked')->default(false)->index();
            $table->boolean('is_demo')->default(true);
            $table->json('details')->nullable();
            $table->timestamps();
        });
        Schema::create('insurance_plan_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('insurance_plan_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });
        // Move the existing demonstration offers into an editable catalog.
        foreach ([['Klini Esencial', 889, 2000000, 30000, 15], ['Klini Equilibrio', 1489, 5000000, 20000, 10], ['Klini Integral', 2249, 15000000, 10000, 5]] as [$name, $premium, $amount, $deductible, $coinsurance]) {
            DB::table('insurance_plans')->insert([
                'category' => 'gmm', 'name' => $name, 'monthly_premium' => $premium, 'insured_amount' => $amount,
                'deductible' => $deductible, 'coinsurance' => $coinsurance, 'is_demo' => true,
                'details' => json_encode([
                    'coverages' => "Hospitalización y cirugía\nTeleconsultas\nAmbulancia\nEmergencias internacionales",
                    'teleconsultations' => 'Por confirmar', 'ambulance' => 'Por confirmar',
                    'conditions' => 'Beneficios ilustrativos. Las condiciones reales se confirmarán en la cotización.',
                    'exclusions' => 'Las exclusiones dependen del contrato oficial del producto.',
                    'waiting_periods' => 'Se confirmarán en la propuesta oficial.',
                    'beneficiaries' => 'Indicar nombre, parentesco y porcentaje. Los porcentajes deben sumar 100%.',
                    'cancellation' => 'Consulta las condiciones oficiales de cancelación y privacidad.',
                    'addons' => ['dental' => ['name' => 'Dental preventivo', 'price' => 119], 'vision' => ['name' => 'Visión', 'price' => 89], 'travel' => ['name' => 'Protección en viajes', 'price' => 149]],
                ], JSON_UNESCAPED_UNICODE), 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        DB::table('insurance_plans')->insert([
            'category' => 'life', 'name' => 'Vida familiar · Ejemplo', 'is_demo' => true,
            'details' => json_encode(['main_coverage' => 'Fallecimiento', 'coverages' => 'Fallecimiento', 'conditions' => 'Producto de demostración. Condiciones por definir.'], JSON_UNESCAPED_UNICODE),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_plan_documents');
        Schema::dropIfExists('insurance_plans');
    }
};
