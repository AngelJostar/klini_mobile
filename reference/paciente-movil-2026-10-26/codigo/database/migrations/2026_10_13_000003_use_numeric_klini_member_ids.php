<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            DB::table('users')->where('account_category', 'klini')
                ->chunkById(200, function ($users): void {
                    foreach ($users as $user) {
                        $number = $user->klini_member_id;
                        if (preg_match('/^KLI-(\d+)$/', (string) $number, $matches)) {
                            $number = $matches[1];
                        } elseif (! ctype_digit((string) $number)) {
                            $number = str_pad((string) $user->id, 8, '0', STR_PAD_LEFT);
                        }

                        if ($number !== $user->klini_member_id) {
                            DB::table('users')->where('id', $user->id)->update(['klini_member_id' => $number]);
                        }
                    }
                });
        });
    }

    public function down(): void
    {
        DB::transaction(function (): void {
            DB::table('users')->where('account_category', 'klini')
                ->chunkById(200, function ($users): void {
                    foreach ($users as $user) {
                        if (ctype_digit((string) $user->klini_member_id)) {
                            DB::table('users')->where('id', $user->id)
                                ->update(['klini_member_id' => 'KLI-'.$user->klini_member_id]);
                        }
                    }
                });
        });
    }
};
