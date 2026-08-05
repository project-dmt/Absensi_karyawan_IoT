<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Division;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = Carbon::today(config('app.timezone'))->toDateString();

        $totalKaryawan = Employee::count();
        $karyawanAktif = Employee::where('status', 'aktif')->count();

        $absensiHariIni = Attendance::where('tanggal', $today)
            ->selectRaw('status, count(*) as jumlah')
            ->groupBy('status')
            ->pluck('jumlah', 'status');

        $totalHadir = ($absensiHariIni->get('Hadir', 0)) + ($absensiHariIni->get('Terlambat', 0));
        $totalTerlambat = $absensiHariIni->get('Terlambat', 0);
        $totalIzin = $absensiHariIni->get('Izin', 0);
        $totalAlpha = max(0, $karyawanAktif - $totalHadir - $totalIzin);

        $karyawanPerDivisi = Division::withCount('employees')
            ->get()
            ->pluck('employees_count', 'nama_divisi');

        return $this->successResponse([
            'total_karyawan' => $totalKaryawan,
            'karyawan_aktif' => $karyawanAktif,
            'absensi_hari_ini' => [
                'total_hadir' => $totalHadir,
                'hadir' => $totalHadir - $totalTerlambat,
                'terlambat' => $totalTerlambat,
                'izin' => $totalIzin,
                'alpha' => $totalAlpha,
            ],
            'karyawan_per_divisi' => $karyawanPerDivisi,
        ], 'Dashboard berhasil diambil');
    }

    /**
     * Detail karyawan terlambat hari ini
     */
    public function terlambat(Request $request)
    {
        $today = Carbon::today(config('app.timezone'))->toDateString();

        $schedule = \App\Models\Schedule::first();
        $jamStandar = $schedule ? $schedule->jam_masuk_standar : config('absensi.default_schedule.jam_masuk');

        $data = Attendance::where('tanggal', $today)
            ->where('attendance.status', 'Terlambat')
            ->join('employees', 'attendance.employee_id', '=', 'employees.id')
            ->join('divisions', 'employees.divisi_id', '=', 'divisions.id')
            ->select(
                'employees.id',
                'employees.nama',
                'employees.nip',
                'divisions.nama_divisi as divisi',
                'attendance.jam_masuk',
            )
            ->orderBy('attendance.jam_masuk', 'asc')
            ->get()
            ->map(function ($item) use ($jamStandar) {
                $jamMasuk = Carbon::parse($item->jam_masuk);
                $jamStandarCarbon = Carbon::parse($jamStandar);
                $selisihMenit = $jamMasuk->diffInMinutes($jamStandarCarbon);

                return [
                    'id' => $item->id,
                    'nama' => $item->nama,
                    'nip' => $item->nip,
                    'divisi' => $item->divisi,
                    'jam_masuk' => $item->jam_masuk,
                    'jam_standar' => $jamStandar,
                    'keterlambatan' => $selisihMenit,
                ];
            });

        return $this->successResponse($data, 'Data karyawan terlambat berhasil diambil');
    }

    /**
     * Detail karyawan hadir tepat waktu hari ini
     */
    public function hadir(Request $request)
    {
        $today = Carbon::today(config('app.timezone'))->toDateString();

        $data = Attendance::where('tanggal', $today)
            ->where('attendance.status', 'Hadir')
            ->join('employees', 'attendance.employee_id', '=', 'employees.id')
            ->join('divisions', 'employees.divisi_id', '=', 'divisions.id')
            ->select(
                'employees.id',
                'employees.nama',
                'employees.nip',
                'divisions.nama_divisi as divisi',
                'attendance.jam_masuk',
            )
            ->orderBy('attendance.jam_masuk', 'asc')
            ->get();

        return $this->successResponse($data, 'Data karyawan hadir berhasil diambil');
    }

    /**
     * Detail karyawan tidak hadir hari ini (alpha + izin)
     */
    public function tidakHadir(Request $request)
    {
        $today = Carbon::today(config('app.timezone'))->toDateString();

        $data = Employee::where('status', 'aktif')
            ->whereDoesntHave('attendances', function ($query) use ($today) {
                $query->where('tanggal', $today);
            })
            ->join('divisions', 'employees.divisi_id', '=', 'divisions.id')
            ->select(
                'employees.id',
                'employees.nama',
                'employees.nip',
                'divisions.nama_divisi as divisi',
            )
            ->orderBy('employees.nama', 'asc')
            ->get();

        return $this->successResponse($data, 'Data karyawan tidak hadir berhasil diambil');
    }
}
