<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Existing patient/doctor access accounts were explicitly included in membership.
        DB::table('users')->whereIn('role', ['patient', 'doctor'])
            ->whereNull('klini_member_id')->chunkById(200, function ($users): void {
                foreach ($users as $user) {
                    DB::table('users')->where('id', $user->id)->update([
                        'account_category' => 'klini',
                        'klini_member_id' => 'KLI-'.str_pad((string) $user->id, 8, '0', STR_PAD_LEFT),
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Assigned membership identifiers must survive a data-migration rollback.
    }
};
