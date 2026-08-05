<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Attendance;
use App\Services\AbsensiService;
use App\Services\AuditLogService;
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

        AuditLogService::log('create_absensi_manual', $absensi, null, $absensi->toArray(), $request);

        return $this->successResponse($absensi, 'Absensi manual berhasil ditambahkan', 201);
    }

    public function update(UpdateAbsensiRequest $request, Attendance $absensi)
    {
        $old = $absensi->toArray();
        $absensi->update($request->validated());

        AuditLogService::log('update_absensi', $absensi, $old, $absensi->fresh()->toArray(), $request);

        return $this->successResponse($absensi->fresh(), 'Absensi berhasil diupdate');
    }

    public function destroy(Request $request, Attendance $absensi)
    {
        $old = $absensi->toArray();
        $absensi->delete();

        AuditLogService::log('delete_absensi', null, $old, null, $request);

        return $this->successResponse(null, 'Absensi berhasil dihapus');
    }

    public function index(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'tanggal' => 'required|date',
        ]);

        $absensi = Attendance::with('employee')
            ->where('employee_id', $request->employee_id)
            ->whereDate('tanggal', $request->tanggal)
            ->orderBy('tanggal', 'desc')
            ->get();

        return $this->successResponse($absensi, 'Data absensi berhasil diambil');
    }

    public function history(Request $request, Employee $employee)
    {
        $employee->load('division');

        $query = Attendance::where('employee_id', $employee->id)
            ->orderBy('tanggal', 'desc');

        if ($request->has('dari')) {
            $query->whereDate('tanggal', '>=', $request->dari);
        }

        if ($request->has('sampai')) {
            $query->whereDate('tanggal', '<=', $request->sampai);
        }

        $absensi = $query->get();

        $summary = [
            'total' => $absensi->count(),
            'hadir' => $absensi->where('status', 'Hadir')->count(),
            'terlambat' => $absensi->where('status', 'Terlambat')->count(),
            'alpha' => $absensi->where('status', 'Alpha')->count(),
            'izin' => $absensi->where('status', 'Izin')->count(),
        ];

        return $this->successResponse([
            'employee' => $employee,
            'absensi' => $absensi,
            'summary' => $summary,
        ], 'Riwayat absensi berhasil diambil');
    }
}
