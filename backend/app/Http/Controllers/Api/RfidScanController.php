<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\RfidScan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RfidScanController extends Controller
{
    /**
     * Batas waktu sesi scan (detik).
     */
    public const TTL_SECONDS = 60;

    /**
     * Mulai sesi scan kartu RFID dari form tambah/edit karyawan.
     * Dipanggil frontend saat admin klik "Scan Kartu".
     */
    public function store(Request $request)
    {
        // Nonaktifkan sesi waiting lama biar cuma satu yang aktif
        RfidScan::where('status', 'waiting')->update(['status' => 'expired']);

        $scan = RfidScan::create([
            'token' => Str::random(40),
            'status' => 'waiting',
            'expires_at' => now()->addSeconds(self::TTL_SECONDS),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sesi scan dibuat. Tempelkan kartu di alat.',
            'data' => [
                'token' => $scan->token,
                'expires_at' => $scan->expires_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Cek status sesi scan (dipanggil frontend saat polling).
     */
    public function show(Request $request, string $token)
    {
        $scan = RfidScan::where('token', $token)->first();

        if (! $scan) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi scan tidak ditemukan.',
                'data' => ['status' => 'expired'],
            ], 404);
        }

        if ($scan->status === 'waiting' && $scan->isExpired()) {
            $scan->update(['status' => 'expired']);
        }

        $data = [
            'status' => $scan->status,
            'uid' => $scan->uid,
        ];

        // Cek apakah UID ini sudah dipakai karyawan lain (biar langsung ketahuan saat scan)
        if ($scan->status === 'completed' && $scan->uid) {
            $owner = Employee::where('rfid_uid', $scan->uid)->first();
            $data['is_used'] = (bool) $owner;
            $data['used_by'] = $owner?->nama;
        }

        return response()->json([
            'success' => true,
            'message' => 'Status sesi scan.',
            'data' => $data,
        ]);
    }

    /**
     * Diterima dari ESP32 (API Key auth) setiap ada kartu discan.
     * Kalau ada sesi waiting -> UID dicocokkan ke sesi itu (mode register).
     * Kalau tidak ada -> mode attendance (diproses absensi normal).
     */
    public function announce(Request $request)
    {
        $request->validate([
            'uid' => ['required', 'string', 'regex:/^[A-Fa-f0-9]{4,24}$/'],
        ]);

        $uid = strtoupper($request->input('uid'));

        $pending = RfidScan::where('status', 'waiting')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if ($pending) {
            $pending->update(['status' => 'completed', 'uid' => $uid]);

            return response()->json([
                'success' => true,
                'message' => 'UID diterima untuk registrasi kartu.',
                'data' => ['mode' => 'register', 'uid' => $uid],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tidak ada sesi registrasi, lanjut absensi.',
            'data' => ['mode' => 'attendance', 'uid' => $uid],
        ]);
    }
}