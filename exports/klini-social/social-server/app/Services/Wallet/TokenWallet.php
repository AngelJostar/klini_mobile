<?php

namespace App\Services\Wallet;

use Illuminate\Support\Facades\DB;

class TokenWallet
{
    public function balance(int $userId): int
    {
        return (int) DB::table('wallet_token_entries')->where('user_id', $userId)->sum('amount');
    }

    // Called within the same transaction that creates the event.
    public function creditEvent(int $userId, int $activityId, string $title): void
    {
        DB::table('wallet_token_entries')->insert([
            'user_id' => $userId, 'activity_id' => $activityId, 'amount' => 1,
            'concept' => mb_substr('Evento creado: '.$title, 0, 255), 'created_at' => now(),
        ]);
    }

    public function summary(int $userId): array
    {
        return [
            'balance' => $this->balance($userId), 'unit' => 'Token',
            'movements' => DB::table('wallet_token_entries')->where('user_id', $userId)
                ->orderByDesc('id')->limit(50)->get(['id', 'activity_id', 'amount', 'concept', 'created_at']),
        ];
    }
}
