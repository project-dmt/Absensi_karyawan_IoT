<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Attendance;
use App\Services\AbsensiService;
use App\Http\Requests\StoreAbsensiManualRequest;
use App\Http\Requests\UpdateAbsensiRequest;

class AbsensiController extends Controller
{
    public function __construct(
        private AbsensiService $absensiService
    ) {}

    public function storeFromDevice(Request $request)
    {
        $validated = $request->validate([
            'uid' => 'required|string',
        ]);

        $result = $this->absensiService->processFromDevice($validated['uid']);

        return $this->successResponse($result, 'Absensi berhasil', 201);
    }

    public function storeManual(StoreAbsensiManualRequest $request)
    {
        $validated = $request->validated();
        $absensi = $this->absensiService->processManual($validated, $request->user()->id);

        return $this->successResponse($absensi, 'Absensi manual berhasil ditambahkan', 201);
    }

    public function update(UpdateAbsensiRequest $request, Attendance $absensi)
    {
        $absensi->update($request->validated());

        return $this->successResponse($absensi->fresh(), 'Absensi berhasil diupdate');
    }

    public function destroy(Attendance $absensi)
    {
        $absensi->delete();

        return $this->successResponse(null, 'Absensi berhasil dihapus');
    }

    public function history(Request $request, Employee $employee)
    {
        $query = Attendance::where('employee_id', $employee->id)
            ->orderBy('tanggal', 'desc');

        if ($request->has('bulan')) {
            $bulan = \Carbon\Carbon::parse($request->bulan);
            $query->whereYear('tanggal', $bulan->year)
                  ->whereMonth('tanggal', $bulan->month);
        }

        $perPage = $request->per_page ?? config('absensi.pagination.per_page');
        $absensi = $query->paginate($perPage);

        return $this->successResponse([
            'karyawan' => $employee->only(['id', 'nama', 'nip']),
            'riwayat' => $absensi,
        ], 'Riwayat absensi berhasil diambil');
    }
}
