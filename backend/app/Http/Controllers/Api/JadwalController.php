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

        return response()->json([
            'success' => true,
            'data' => $jadwal,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'jam_masuk_standar' => 'required|date_format:H:i:s',
            'jam_pulang_standar' => 'required|date_format:H:i:s',
            'toleransi_menit' => 'required|integer|min:0',
        ]);

        $jadwal = Schedule::firstOrCreate([], $validated);
        $jadwal->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Jadwal kerja berhasil diupdate',
            'data' => $jadwal,
        ]);
    }
}
