<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Schedule;
use App\Exceptions\ApiException;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AbsensiService
{
    public function processFromDevice(string $rfidUid): array
    {
        return DB::transaction(function () use ($rfidUid) {
            $karyawan = Employee::where('rfid_uid', $rfidUid)
                ->lockForUpdate()
                ->first();

            if (!$karyawan) {
                throw new ApiException('Kartu RFID tidak terdaftar', 404);
            }

            if ($karyawan->status !== 'aktif') {
                throw new ApiException('Karyawan tidak aktif', 403);
            }

            $today = Carbon::today(config('app.timezone'))->toDateString();

            $sudahAbsen = Attendance::where('employee_id', $karyawan->id)
                ->where('tanggal', $today)
                ->lockForUpdate()
                ->first();

            if ($sudahAbsen) {
                return $this->handleCheckout($karyawan, $sudahAbsen);
            }

            return $this->handleCheckin($karyawan, $today);
        });
    }

    public function processManual(array $data, int $userId): Attendance
    {
        return DB::transaction(function () use ($data, $userId) {
            $sudahAda = Attendance::where('employee_id', $data['employee_id'])
                ->where('tanggal', $data['tanggal'])
                ->lockForUpdate()
                ->first();

            if ($sudahAda) {
                throw new ApiException('Absensi untuk karyawan ini tanggal ini sudah ada');
            }

            $data['input_by'] = $userId;
            return Attendance::create($data);
        });
    }

    private function handleCheckout(Employee $karyawan, Attendance $absensi): array
    {
        $noCheckoutStatuses = config('absensi.no_checkout_statuses', ['Alpha', 'Izin']);

        if (in_array($absensi->status, $noCheckoutStatuses)) {
            throw new ApiException(
                'Absensi dengan status ' . $absensi->status . ' tidak bisa checkout'
            );
        }

        if ($absensi->jam_pulang) {
            throw new ApiException('Anda sudah checkout hari ini', 400);
        }

        $jadwal = Schedule::first();
        $jamPulangStandar = $jadwal
            ? $jadwal->jam_pulang_standar
            : config('absensi.default_schedule.jam_pulang');

        $jamSekarang = Carbon::now(config('app.timezone'));
        $jamPulangCarbon = Carbon::parse($jamPulangStandar);

        if ($jamSekarang->lt($jamPulangCarbon)) {
            throw new ApiException(
                "Checkout belum bisa. Jam pulang standar: {$jamPulangStandar}"
            );
        }

        $jamPulang = $jamSekarang->format('H:i:s');
        $absensi->update(['jam_pulang' => $jamPulang]);

        return [
            'nama' => $karyawan->nama,
            'status' => 'Checkout Berhasil',
            'jam_pulang' => $jamPulang,
        ];
    }

    private function handleCheckin(Employee $karyawan, string $today): array
    {
        $jadwal = Schedule::first();
        $jamStandar = $jadwal
            ? $jadwal->jam_masuk_standar
            : config('absensi.default_schedule.jam_masuk');
        $toleransi = $jadwal
            ? $jadwal->toleransi_menit
            : config('absensi.default_schedule.toleransi_menit');

        $jamMasuk = Carbon::now(config('app.timezone'))->format('H:i:s');

        $jamMasukCarbon = Carbon::parse($jamMasuk);
        $jamStandarCarbon = Carbon::parse($jamStandar);
        $batasTerlambat = $jamStandarCarbon->copy()->addMinutes($toleransi);

        $status = 'Hadir';
        if ($jamMasukCarbon->gt($batasTerlambat)) {
            $status = 'Terlambat';
        }

        Attendance::create([
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
    }
}
