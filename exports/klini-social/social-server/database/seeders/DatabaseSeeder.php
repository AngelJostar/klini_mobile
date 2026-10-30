<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }
        foreach (['member' => 'Usuario de prueba', 'admin' => 'Administrador de prueba'] as $account => $name) {
            User::firstOrCreate(['email' => $account.'@social.test'], [
                'name' => $name,
                'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(48)),
            ]);
        }
    }
}
