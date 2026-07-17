<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Schedule;
use Carbon\Carbon;

class AbsensiController extends Controller
{
    // Endpoint untuk ESP32 (via API Key)
    public function storeFromDevice(Request $request)
    {
        $validated = $request->validate([
            'uid' => 'required|string',
        ]);

        // Cari karyawan berdasarkan RFID UID
        $karyawan = Employee::where('rfid_uid', $validated['uid'])
            ->where('status', 'aktif')
            ->first();

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Kartu tidak terdaftar atau tidak aktif',
            ], 404);
        }

        // Cek apakah sudah absen hari ini
        $today = Carbon::today()->toDateString();
        $sudahAbsen = Attendance::where('employee_id', $karyawan->id)
            ->where('tanggal', $today)
            ->first();

        if ($sudahAbsen) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah melakukan absensi hari ini',
                'data' => [
                    'nama' => $karyawan->nama,
                    'status' => 'Sudah Absen',
                ],
            ], 400);
        }

        // Ambil jadwal kerja
        $jadwal = Schedule::first();
        $jamMasuk = Carbon::now()->format('H:i:s');
        $jamStandar = $jadwal->jam_masuk_standar;
        $toleransi = $jadwal->toleransi_menit;

        // Tentukan status kehadiran
        $jamMasukCarbon = Carbon::parse($jamMasuk);
        $jamStandarCarbon = Carbon::parse($jamStandar);
        $batasTerlambat = $jamStandarCarbon->copy()->addMinutes($toleransi);

        $status = 'Hadir';
        if ($jamMasukCarbon->gt($batasTerlambat)) {
            $status = 'Terlambat';
        }

        // Simpan absensi
        $absensi = Attendance::create([
            'employee_id' => $karyawan->id,
            'tanggal' => $today,
            'jam_masuk' => $jamMasuk,
            'status' => $status,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Absensi berhasil',
            'data' => [
                'nama' => $karyawan->nama,
                'status' => $status,
                'jam_masuk' => $jamMasuk,
            ],
        ]);
    }

    // Endpoint untuk Admin (via Sanctum)
    public function storeManual(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'tanggal' => 'required|date',
            'jam_masuk' => 'nullable|date_format:H:i:s',
            'jam_pulang' => 'nullable|date_format:H:i:s',
            'status' => 'required|in:Hadir,Terlambat,Alpha,Izin',
            'keterangan' => 'nullable|string|max:255',
        ]);

        // Cek duplikat
        $sudahAda = Attendance::where('employee_id', $validated['employee_id'])
            ->where('tanggal', $validated['tanggal'])
            ->first();

        if ($sudahAda) {
            return response()->json([
                'success' => false,
                'message' => 'Absensi untuk karyawan ini tanggal ini sudah ada',
            ], 400);
        }

        $validated['input_by'] = $request->user()->id;
        $absensi = Attendance::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Absensi manual berhasil ditambahkan',
            'data' => $absensi,
        ], 201);
    }
}
