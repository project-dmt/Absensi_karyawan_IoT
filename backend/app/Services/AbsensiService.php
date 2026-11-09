<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\RfidScan;
use App\Models\Schedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AbsensiService
{
    /**
     * Entry point untuk tap kartu dari ESP32.
     *
     * Flow:
     *  1. Kalau ada sesi registrasi kartu yang masih waiting (admin lagi nunggu tap
     *     di form karyawan), UID kartu langsung ditangkap ke sesi itu.
     *  2. Kalau kartu itu milik karyawan yang sudah terdaftar, absensi tetap diproses
     *     normal (biar tap-nya tidak hilang) dan digabung dengan mode register.
     *  3. Kalau kartu belum dikenal dan tidak ada sesi registrasi -> error 404.
     */
    public function processFromDevice(string $rfidUid): array
    {
        // Normalisasi UID: ESP32 kirim hex uppercase, tapi tetep aman kalau ada spasi/case beda
        $uid = strtoupper(trim($rfidUid));

        $captured = $this->captureForRegistration($uid);

        $result = DB::transaction(function () use ($uid, $captured) {
            $karyawan = $this->findEmployeeByUid($uid);

            if (! $karyawan) {
                // Kartu belum terdaftar. Kalau sesi registrasi yang menangkapnya,
                // ini sukses (admin tinggal simpan karyawannya).
                if ($captured) {
                    return [
                        'mode' => 'register',
                        'uid' => $uid,
                    ];
                }

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

        // Kartu lama yang ikut ketangkap sesi registrasi: gabung mode register ke hasil absensi
        if ($captured && ! isset($result['mode'])) {
            $result['mode'] = 'register';
            $result['uid'] = $uid;
        }

        return $result;
    }

    /**
     * Tangkap UID ke sesi registrasi yang masih waiting (kalau ada).
     *
     * @return bool true kalau UID berhasil ditangkap
     */
    private function captureForRegistration(string $uid): bool
    {
        return DB::transaction(function () use ($uid) {
            $pending = RfidScan::where('status', 'waiting')
                ->where('expires_at', '>', now())
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if (! $pending) {
                return false;
            }

            $pending->update(['status' => 'completed', 'uid' => $uid]);

            return true;
        });
    }

    /**
     * Cari karyawan berdasarkan rfid_uid (exact dulu, fallback case-insensitive).
     */
    private function findEmployeeByUid(string $uid): ?Employee
    {
        $karyawan = Employee::where('rfid_uid', $uid)->lockForUpdate()->first();

        if ($karyawan) {
            return $karyawan;
        }

        // Fallback: UID tersimpan dengan huruf kecil (data lama)
        return Employee::whereRaw('UPPER(rfid_uid) = ?', [$uid])
            ->lockForUpdate()
            ->first();
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
                'Absensi dengan status '.$absensi->status.' tidak bisa checkout'
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

        RealtimeEventService::dispatch('checkout', [
            'nama' => $karyawan->nama,
            'nip' => $karyawan->nip,
            'status' => 'Checkout',
            'jam' => $jamPulang,
        ]);

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

        RealtimeEventService::dispatch('check_in', [
            'nama' => $karyawan->nama,
            'nip' => $karyawan->nip,
            'status' => $status,
            'jam' => $jamMasuk,
        ]);

        return [
            'nama' => $karyawan->nama,
            'status' => $status,
            'jam_masuk' => $jamMasuk,
        ];
    }
}
