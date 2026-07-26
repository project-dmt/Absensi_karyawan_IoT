<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Division;
use App\Models\Employee;
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
            'password' => Hash::make(env('ADMIN_PASSWORD', 'Admin@123')),
            'role' => 'superadmin',
        ]);

        // Seed divisi default
        $divisiNames = ['HRD', 'IT', 'Marketing', 'Finance', 'Operations'];
        $divisiMap = [];
        foreach ($divisiNames as $name) {
            $d = Division::create(['nama_divisi' => $name]);
            $divisiMap[$name] = $d->id;
        }

        // Seed jadwal kerja default
        Schedule::create([
            'jam_masuk_standar' => '08:00:00',
            'jam_pulang_standar' => '17:00:00',
            'toleransi_menit' => 15,
        ]);

        // Seed karyawan sample
        $karyawanData = [
            ['nama' => 'Budi Santoso', 'nip' => 'NIP001001001001', 'rfid_uid' => 'RFID001', 'divisi' => 'IT', 'status' => 'aktif'],
            ['nama' => 'Siti Rahayu', 'nip' => 'NIP002002002002', 'rfid_uid' => 'RFID002', 'divisi' => 'HRD', 'status' => 'aktif'],
            ['nama' => 'Ahmad Hidayat', 'nip' => 'NIP003003003003', 'rfid_uid' => 'RFID003', 'divisi' => 'Marketing', 'status' => 'aktif'],
            ['nama' => 'Dewi Lestari', 'nip' => 'NIP004004004004', 'rfid_uid' => 'RFID004', 'divisi' => 'Finance', 'status' => 'aktif'],
            ['nama' => 'Rizki Pratama', 'nip' => 'NIP005005005005', 'rfid_uid' => 'RFID005', 'divisi' => 'Operations', 'status' => 'aktif'],
            ['nama' => 'Maya Putri', 'nip' => 'NIP006006006006', 'rfid_uid' => 'RFID006', 'divisi' => 'IT', 'status' => 'nonaktif'],
        ];
        foreach ($karyawanData as $k) {
            Employee::create([
                'nama' => $k['nama'],
                'nip' => $k['nip'],
                'rfid_uid' => $k['rfid_uid'],
                'divisi_id' => $divisiMap[$k['divisi']],
                'status' => $k['status'],
            ]);
        }
    }
}
