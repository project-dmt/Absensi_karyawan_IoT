<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Schedule;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Seed admin default
        User::create([
            'nama' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        // Seed jadwal kerja default
        Schedule::create([
            'jam_masuk_standar' => '08:00:00',
            'jam_pulang_standar' => '17:00:00',
            'toleransi_menit' => 15,
        ]);
    }
}
