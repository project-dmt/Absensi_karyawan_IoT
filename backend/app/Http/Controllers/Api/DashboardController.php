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
        $today = Carbon::today('Asia/Jakarta')->toDateString();

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
}
