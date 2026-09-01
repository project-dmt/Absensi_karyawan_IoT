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

    // ponytail: testing helper — hapus absensi hari ini (bulk), dipakai tombol Testing di Laporan
    // handle offset UTC vs Asia/Jakarta: hapus tanggal WIB + fallback created_at hari ini
    public function clearToday(Request $request)
    {
        if ($request->filled('tanggal')) {
            $request->validate(['tanggal' => 'date']);
            $query = Attendance::whereDate('tanggal', $request->tanggal);
            $label = $request->tanggal;
        } else {
            $today = now('Asia/Jakarta')->toDateString();
            $query = Attendance::whereDate('tanggal', $today)
                ->orWhereDate('created_at', $today);
            $label = 'hari ini';
        }
        $count = $query->count();
        if ($count === 0) {
            return $this->successResponse(['deleted' => 0], 'Tidak ada absensi hari ini');
        }
        $old = $query->get()->toArray();
        $query->delete();
        AuditLogService::log('clear_absensi_today', null, ['count' => $count, 'sample' => array_slice($old, 0, 3)], null, $request);

        return $this->successResponse(['deleted' => $count], "Berhasil hapus {$count} absensi {$label}");
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
