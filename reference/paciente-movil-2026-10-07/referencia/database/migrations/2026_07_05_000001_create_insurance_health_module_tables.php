<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('module')->nullable()->index();
            $table->boolean('is_system')->default(true);
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('permissions', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('module')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('permission_role', function (Blueprint $table): void {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::table('patients', function (Blueprint $table): void {
            $table->string('rfc', 13)->nullable()->after('curp')->index();
            $table->text('address')->nullable()->after('email');
            $table->foreignId('primary_doctor_id')->nullable()->after('status')->constrained('doctors')->nullOnDelete();
            $table->string('risk_level')->default('low')->after('primary_doctor_id')->index();
            $table->date('enrolled_at')->nullable()->after('risk_level');
            $table->text('general_observations')->nullable()->after('enrolled_at');
            $table->foreignId('created_by')->nullable()->after('metadata')->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->softDeletes();
        });

        Schema::create('insurance_policies', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->string('policy_number')->unique();
            $table->string('insurer_name')->index();
            $table->string('plan_name')->nullable()->index();
            $table->string('employer_name')->nullable()->index();
            $table->string('status')->default('active')->index();
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('chronic_conditions', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
            $table->string('default_cie10')->nullable()->index();
            $table->text('description')->nullable();
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('medications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('pharmacy_product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('medication_catalog_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name')->index();
            $table->string('active_substance')->nullable()->index();
            $table->string('presentation')->nullable();
            $table->string('default_dose')->nullable();
            $table->boolean('requires_authorization')->default(false);
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('hospitals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('medical_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('provider_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name')->index();
            $table->string('rfc', 13)->nullable()->index();
            $table->string('network_type')->default('network')->index();
            $table->text('address')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('patient_diagnoses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('chronic_condition_id')->nullable()->constrained()->nullOnDelete();
            $table->string('condition_name')->index();
            $table->date('diagnosed_at')->nullable()->index();
            $table->string('cie10')->nullable()->index();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('specialty')->nullable()->index();
            $table->text('indicated_treatment')->nullable();
            $table->string('follow_up_frequency')->nullable();
            $table->text('required_studies')->nullable();
            $table->text('administrative_notes')->nullable();
            $table->string('status')->default('in_surveillance')->index();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('treatments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_diagnosis_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('medication_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('prescription_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('prescribing_doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->string('medication_name')->index();
            $table->string('active_substance')->nullable()->index();
            $table->string('presentation')->nullable();
            $table->string('dose')->nullable();
            $table->string('frequency')->nullable();
            $table->string('duration')->nullable();
            $table->date('starts_at')->nullable()->index();
            $table->date('ends_at')->nullable()->index();
            $table->boolean('requires_authorization')->default(false);
            $table->string('status')->default('active')->index();
            $table->text('change_reason')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('treatment_change_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('treatment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('previous_payload')->nullable();
            $table->json('new_payload')->nullable();
            $table->text('reason')->nullable();
            $table->timestamp('changed_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('medication_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('treatment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('medication_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('provider_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('quantity_delivered')->default(0);
            $table->string('covered_period')->nullable();
            $table->date('scheduled_delivery_date')->index();
            $table->date('actual_delivery_date')->nullable()->index();
            $table->text('delivery_address')->nullable();
            $table->string('delivery_responsible')->nullable();
            $table->string('status')->default('pending')->index();
            $table->string('delivery_evidence_path')->nullable();
            $table->string('patient_acceptance')->nullable();
            $table->text('observations')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('hospitalizations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hospital_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('hospital_name')->nullable()->index();
            $table->timestamp('admitted_at')->nullable()->index();
            $table->timestamp('discharged_at')->nullable()->index();
            $table->text('reason')->nullable();
            $table->string('admission_diagnosis')->nullable();
            $table->string('discharge_diagnosis')->nullable();
            $table->string('area')->nullable()->index();
            $table->string('event_type')->nullable()->index();
            $table->string('authorization_number')->nullable()->index();
            $table->string('status')->default('active')->index();
            $table->unsignedInteger('stay_days')->default(0);
            $table->text('procedures_summary')->nullable();
            $table->text('inpatient_medications')->nullable();
            $table->text('studies_performed')->nullable();
            $table->text('administrative_notes')->nullable();
            $table->decimal('authorized_amount', 14, 2)->default(0);
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('hospitalization_daily_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('hospitalization_id')->constrained()->cascadeOnDelete();
            $table->date('note_date')->index();
            $table->text('administrative_evolution')->nullable();
            $table->string('general_clinical_status')->nullable()->index();
            $table->text('relevant_changes')->nullable();
            $table->text('additional_requirements')->nullable();
            $table->text('pending_studies')->nullable();
            $table->text('pending_authorizations')->nullable();
            $table->boolean('prolonged_stay_risk')->default(false)->index();
            $table->date('possible_discharge_date')->nullable();
            $table->foreignId('captured_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('hospitalization_procedures', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('hospitalization_id')->constrained()->cascadeOnDelete();
            $table->string('procedure_name')->index();
            $table->timestamp('performed_at')->nullable()->index();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('cost', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('authorizations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('treatment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('hospitalization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type')->index();
            $table->text('medical_request')->nullable();
            $table->text('justification')->nullable();
            $table->date('requested_at')->nullable()->index();
            $table->date('responded_at')->nullable();
            $table->string('status')->default('requested')->index();
            $table->string('authorization_number')->nullable()->index();
            $table->decimal('authorized_amount', 14, 2)->default(0);
            $table->date('valid_until')->nullable()->index();
            $table->text('observations')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('hospitalization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('hospital_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('provider_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider_name')->nullable()->index();
            $table->string('provider_rfc', 13)->nullable()->index();
            $table->string('invoice_number')->index();
            $table->string('fiscal_uuid')->nullable()->unique();
            $table->date('invoice_date')->nullable()->index();
            $table->text('concept')->nullable();
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('vat', 14, 2)->default(0);
            $table->decimal('withholdings', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->string('currency', 3)->default('MXN');
            $table->string('status')->default('received')->index();
            $table->date('paid_at')->nullable()->index();
            $table->text('rejection_reason')->nullable();
            $table->string('xml_path')->nullable();
            $table->string('pdf_path')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('invoice_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('concept_type')->index();
            $table->text('description')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('treatment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('medication_delivery_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('hospitalization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('authorization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('document_type')->index();
            $table->string('file_path')->nullable();
            $table->string('file_mime')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('loaded_at')->nullable()->index();
            $table->date('expires_at')->nullable()->index();
            $table->string('status')->default('current')->index();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('authorizations');
        Schema::dropIfExists('hospitalization_procedures');
        Schema::dropIfExists('hospitalization_daily_notes');
        Schema::dropIfExists('hospitalizations');
        Schema::dropIfExists('medication_deliveries');
        Schema::dropIfExists('treatment_change_logs');
        Schema::dropIfExists('treatments');
        Schema::dropIfExists('patient_diagnoses');
        Schema::dropIfExists('hospitals');
        Schema::dropIfExists('medications');
        Schema::dropIfExists('chronic_conditions');
        Schema::dropIfExists('insurance_policies');

        Schema::table('patients', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropConstrainedForeignId('updated_by');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn([
                'general_observations',
                'enrolled_at',
                'risk_level',
                'address',
                'rfc',
            ]);
            $table->dropConstrainedForeignId('primary_doctor_id');
        });

        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
