<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Schedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AbsensiController extends Controller
{
    // Endpoint untuk ESP32 (via API Key)
    public function storeFromDevice(Request $request)
    {
        $validated = $request->validate([
            'uid' => 'required|string',
        ]);

        $result = DB::transaction(function () use ($validated) {
            // Cari karyawan + lock row untuk cegah race condition
            $karyawan = Employee::where('rfid_uid', $validated['uid'])
                ->lockForUpdate()
                ->first();

            if (!$karyawan) {
                throw new \App\Exceptions\ApiException('Kartu RFID tidak terdaftar', 404);
            }

            if ($karyawan->status !== 'aktif') {
                throw new \App\Exceptions\ApiException('Karyawan tidak aktif', 403);
            }

            $today = Carbon::today('Asia/Jakarta')->toDateString();

            // Cek apakah sudah absen hari ini + lock row
            $sudahAbsen = Attendance::where('employee_id', $karyawan->id)
                ->where('tanggal', $today)
                ->lockForUpdate()
                ->first();

            // Kalau sudah absen masuk → checkout (isi jam pulang)
            if ($sudahAbsen) {
                // Cek status — Alpha/Izin gak boleh checkout
                if (in_array($sudahAbsen->status, ['Alpha', 'Izin'])) {
                    throw new \App\Exceptions\ApiException(
                        'Absensi dengan status ' . $sudahAbsen->status . ' tidak bisa checkout'
                    );
                }

                if ($sudahAbsen->jam_pulang) {
                    throw new \App\Exceptions\ApiException('Anda sudah checkout hari ini', 400);
                }

                $jamPulang = Carbon::now('Asia/Jakarta')->format('H:i:s');
                $sudahAbsen->update(['jam_pulang' => $jamPulang]);

                return [
                    'nama' => $karyawan->nama,
                    'status' => 'Checkout Berhasil',
                    'jam_pulang' => $jamPulang,
                ];
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

            // Simpan absensi
            $absensi = Attendance::create([
                'employee_id' => $karyawan->id,
                'tanggal' => $today,
                'jam_masuk' => $jamMasuk,
                'status' => $status,
            ]);

            return [
                'nama' => $karyawan->nama,
                'status' => $status,
                'jam_masuk' => $jamMasuk,
            ];
        });

        return $this->successResponse($result, 'Absensi berhasil', 201);
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

        $absensi = DB::transaction(function () use ($validated, $request) {
            // Cek duplikat + lock
            $sudahAda = Attendance::where('employee_id', $validated['employee_id'])
                ->where('tanggal', $validated['tanggal'])
                ->lockForUpdate()
                ->first();

            if ($sudahAda) {
                throw new \App\Exceptions\ApiException('Absensi untuk karyawan ini tanggal ini sudah ada');
            }

            $validated['input_by'] = $request->user()->id;
            return Attendance::create($validated);
        });

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

        return $this->successResponse($absensi->fresh(), 'Absensi berhasil diupdate');
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

        $absensi = $query->paginate($request->per_page ?? 15);

        return $this->successResponse([
            'karyawan' => $employee->only(['id', 'nama', 'nip']),
            'riwayat' => $absensi,
        ], 'Riwayat absensi berhasil diambil');
    }
}
