<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const IDENTIFIER_TABLES = [
        'institutions',
        'medical_units',
        'services',
        'doctors',
        'provider_requests',
        'medication_catalog_items',
        'pharmacy_products',
        'patient_orders',
        'messenger_profiles',
        'procedure_areas',
    ];

    private const METADATA_TABLES = [
        'users',
        'institutions',
        'medical_units',
        'services',
        'procedure_areas',
    ];

    public function up(): void
    {
        foreach (self::IDENTIFIER_TABLES as $table) {
            $this->renameColumnWhenPresent($table, 'legacy_id', 'external_id');
        }

        if (Schema::hasTable('legacy_payloads') && ! Schema::hasTable('source_payloads')) {
            Schema::rename('legacy_payloads', 'source_payloads');
        }

        $this->renameColumnWhenPresent('source_payloads', 'legacy_id', 'external_id');
        $this->moveMetadataKeys('legacy_id', 'external_id');
        $this->moveMetadataKeys('legacy_area', 'source_area');
        $this->moveMetadataKeys('legacy_payload', 'source_payload');
    }

    public function down(): void
    {
        $this->moveMetadataKeys('source_payload', 'legacy_payload');
        $this->moveMetadataKeys('source_area', 'legacy_area');
        $this->moveMetadataKeys('external_id', 'legacy_id');

        if (Schema::hasTable('source_payloads') && ! Schema::hasTable('legacy_payloads')) {
            Schema::rename('source_payloads', 'legacy_payloads');
        }

        $this->renameColumnWhenPresent('legacy_payloads', 'external_id', 'legacy_id');

        foreach (self::IDENTIFIER_TABLES as $table) {
            $this->renameColumnWhenPresent($table, 'external_id', 'legacy_id');
        }
    }

    private function renameColumnWhenPresent(string $table, string $from, string $to): void
    {
        if (Schema::hasTable($table) && Schema::hasColumn($table, $from) && ! Schema::hasColumn($table, $to)) {
            Schema::table($table, fn ($blueprint) => $blueprint->renameColumn($from, $to));
        }
    }

    private function moveMetadataKeys(string $from, string $to): void
    {
        foreach (self::METADATA_TABLES as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'metadata')) {
                continue;
            }

            DB::table($table)
                ->select(['id', 'metadata'])
                ->orderBy('id')
                ->eachById(function (object $record) use ($table, $from, $to): void {
                    $metadata = json_decode((string) $record->metadata, true);

                    if (! is_array($metadata) || ! array_key_exists($from, $metadata) || array_key_exists($to, $metadata)) {
                        return;
                    }

                    $metadata[$to] = $metadata[$from];
                    unset($metadata[$from]);

                    DB::table($table)->where('id', $record->id)->update([
                        'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]);
                });
        }
    }
};
