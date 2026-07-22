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
        $karyawan = Employee::where('rfid_uid', $validated['uid'])->first();

        if (!$karyawan) {
            return $this->errorResponse('Kartu RFID tidak terdaftar', 404);
        }

        if ($karyawan->status !== 'aktif') {
            return $this->errorResponse('Karyawan tidak aktif', 403);
        }

        // Cek apakah sudah absen hari ini
        $today = Carbon::today('Asia/Jakarta')->toDateString();
        $sudahAbsen = Attendance::where('employee_id', $karyawan->id)
            ->where('tanggal', $today)
            ->first();

        // Kalau sudah absen masuk → checkout (isi jam pulang)
        if ($sudahAbsen) {
            if ($sudahAbsen->jam_pulang) {
                return $this->errorResponse('Anda sudah checkout hari ini', 400, [
                    'nama' => $karyawan->nama,
                    'status' => 'Sudah Checkout',
                ]);
            }

            $jamPulang = Carbon::now('Asia/Jakarta')->format('H:i:s');
            $sudahAbsen->update(['jam_pulang' => $jamPulang]);

            return $this->successResponse([
                'nama' => $karyawan->nama,
                'status' => 'Checkout Berhasil',
                'jam_pulang' => $jamPulang,
            ], 'Checkout berhasil');
        }

        // Ambil jadwal kerja dengan fallback defaults
        $jadwal = Schedule::first();
        $jamStandar = $jadwal ? $jadwal->jam_masuk_standar : '08:00:00';
        $toleransi = $jadwal ? $jadwal->toleransi_menit : 15;

        $jamMasuk = Carbon::now('Asia/Jakarta')->format('H:i:s');

        // Tentukan status kehadiran
        $jamMasukCarbon = Carbon::parse($jamMasuk);
        $jamStandarCarbon = Carbon::parse($jamStandar);
        $batasTerlambat = $jamStandarCarbon->copy()->addMinutes($toleransi);

        $status = 'Hadir';
        if ($jamMasukCarbon->gt($batasTerlambat)) {
            $status = 'Terlambat';
        }

        // Simpan absensi (dalam transaction untuk hindari race condition)
        $absensi = \Illuminate\Support\Facades\DB::transaction(function () use ($karyawan, $today, $jamMasuk, $status) {
            return Attendance::create([
                'employee_id' => $karyawan->id,
                'tanggal' => $today,
                'jam_masuk' => $jamMasuk,
                'status' => $status,
            ]);
        });

        return $this->successResponse([
            'nama' => $karyawan->nama,
            'status' => $status,
            'jam_masuk' => $jamMasuk,
        ], 'Absensi berhasil', 201);
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
            return $this->errorResponse('Absensi untuk karyawan ini tanggal ini sudah ada');
        }

        $validated['input_by'] = $request->user()->id;
        $absensi = Attendance::create($validated);

        return $this->successResponse($absensi, 'Absensi manual berhasil ditambahkan', 201);
    }

    // Update absensi oleh admin
    public function update(Request $request, $id)
    {
        $absensi = Attendance::findOrFail($id);

        $validated = $request->validate([
            'jam_masuk' => 'nullable|date_format:H:i:s',
            'jam_pulang' => 'nullable|date_format:H:i:s',
            'status' => 'sometimes|in:Hadir,Terlambat,Alpha,Izin',
            'keterangan' => 'nullable|string|max:255',
        ]);

        $absensi->update($validated);

        return $this->successResponse($absensi, 'Absensi berhasil diupdate');
    }

    // Hapus absensi oleh admin
    public function destroy($id)
    {
        $absensi = Attendance::findOrFail($id);
        $absensi->delete();

        return $this->successResponse(null, 'Absensi berhasil dihapus');
    }

    // Riwayat absensi per karyawan
    public function history(Request $request, $employeeId)
    {
        $employee = Employee::findOrFail($employeeId);

        $query = Attendance::where('employee_id', $employeeId)
            ->orderBy('tanggal', 'desc');

        if ($request->has('bulan')) {
            $bulan = Carbon::parse($request->bulan);
            $query->whereYear('tanggal', $bulan->year)
                  ->whereMonth('tanggal', $bulan->month);
        }

        $absensi = $query->get();

        return $this->successResponse([
            'karyawan' => $employee->only(['id', 'nama', 'nip']),
            'riwayat' => $absensi,
        ], 'Riwayat absensi berhasil diambil');
    }
}
