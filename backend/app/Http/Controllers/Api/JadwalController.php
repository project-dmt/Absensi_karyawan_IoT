<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Schedule;

class JadwalController extends Controller
{
    public function index()
    {
        $jadwal = Schedule::first();

        return $this->successResponse($jadwal, 'Data jadwal berhasil diambil');
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'jam_masuk_standar' => 'required|date_format:H:i:s',
            'jam_pulang_standar' => 'required|date_format:H:i:s',
            'toleransi_menit' => 'required|integer|min:0',
        ]);

        $jadwal = Schedule::first();
        if ($jadwal) {
            $jadwal->update($validated);
        } else {
            $jadwal = Schedule::create($validated);
        }

        return $this->successResponse($jadwal, 'Jadwal kerja berhasil diupdate');
    }
}
