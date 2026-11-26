<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAbsensiManualRequest;
use App\Http\Requests\UpdateAbsensiRequest;
use App\Models\Attendance;
use App\Models\Employee;
use App\Services\AbsensiService;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AbsensiController extends Controller
{
    public function __construct(
        private AbsensiService $absensiService
    ) {}

    public function storeFromDevice(Request $request)
    {
        $validated = $request->validate([
            'uid' => 'required|string|max:64',
        ]);

        $result = $this->absensiService->processFromDevice($validated['uid']);

        // Murni registrasi kartu (kartu belum dikenal) -> belum ada absensi yang tercatat
        if (($result['mode'] ?? null) === 'register' && ! isset($result['nama'])) {
            return $this->successResponse($result, 'UID diterima untuk registrasi kartu');
        }

        return $this->successResponse($result, 'Absensi berhasil', 201);
    }

    public function storeManual(StoreAbsensiManualRequest $request)
    {
        $validated = $request->validated();
        $absensi = $this->absensiService->processManual($validated, $request->user()->id);

        AuditLogService::log('create_absensi_manual', $absensi, null, $absensi->toArray(), $request);

        return $this->successResponse($absensi, 'Absensi manual berhasil ditambahkan', 201);
    }

    public function update(UpdateAbsensiRequest $request, Attendance $attendance)
    {
        $old = $attendance->toArray();
        $attendance->update($request->validated());
        $updated = $attendance->fresh();

        AuditLogService::log('update_absensi', $attendance, $old, $updated?->toArray(), $request);

        return $this->successResponse($updated?->toArray() ?? $attendance->toArray(), 'Absensi berhasil diupdate');
    }

    public function destroy(Request $request, Attendance $absensi)
    {
        $old = $absensi->toArray();
        $absensi->delete();

        AuditLogService::log('delete_absensi', null, $old, null, $request);

        return $this->successResponse(null, 'Absensi berhasil dihapus');
    }

    // ponytail: testing helper — clear only the requested Jakarta calendar day.
    public function clearToday(Request $request)
    {
        $request->validate(['tanggal' => 'nullable|date']);
        $timezone = 'Asia/Jakarta';
        $hasRequestedDate = $request->filled('tanggal');
        $date = $hasRequestedDate
            ? Carbon::parse($request->input('tanggal'), $timezone)->toDateString()
            : now($timezone)->toDateString();
        $label = $hasRequestedDate ? $date : 'hari ini';
        $start = Carbon::parse($date, $timezone)->startOfDay();
        $end = $start->copy()->endOfDay();

        [$count, $eventsDeleted] = DB::transaction(function () use ($date, $start, $end, $request) {
            $query = Attendance::whereDate('tanggal', $date);
            $count = $query->count();
            $old = $query->limit(3)->get()->toArray();
            $query->delete();
            $eventsDeleted = DB::table('realtime_events')
                ->whereBetween('created_at', [$start, $end])
                ->delete();
            AuditLogService::log('clear_absensi_today', null, [
                'count' => $count,
                'events_count' => $eventsDeleted,
                'sample' => $old,
            ], null, $request);
            return [$count, $eventsDeleted];
        });

        return $this->successResponse([
            'deleted' => $count,
            'events_deleted' => $eventsDeleted,
        ], "Berhasil hapus {$count} absensi {$label}");
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
        $request->validate([
            'dari' => 'nullable|date',
            'sampai' => 'nullable|date|after_or_equal:dari',
            'per_page' => 'nullable|integer|min:1|max:1000',
        ]);

        $employee->load('division');

        $query = Attendance::where('employee_id', $employee->id)
            ->orderBy('tanggal', 'desc');

        if ($request->has('dari')) {
            $query->whereDate('tanggal', '>=', $request->dari);
        }

        if ($request->has('sampai')) {
            $query->whereDate('tanggal', '<=', $request->sampai);
        }

        // Summary dihitung dari SELURUH riwayat (bukan cuma halaman yang dikirim)
        $rekap = (clone $query)
            ->reorder()
            ->selectRaw('status, COUNT(*) as jml')
            ->groupBy('status')
            ->pluck('jml', 'status');

        $summary = [
            'total' => (int) $rekap->sum(),
            'hadir' => (int) ($rekap['Hadir'] ?? 0),
            'terlambat' => (int) ($rekap['Terlambat'] ?? 0),
            'alpha' => (int) ($rekap['Alpha'] ?? 0),
            'izin' => (int) ($rekap['Izin'] ?? 0),
            'sakit' => (int) ($rekap['Sakit'] ?? 0),
        ];

        $absensi = $query->limit((int) $request->input('per_page', 500))->get();

        return $this->successResponse([
            'employee' => $employee,
            'absensi' => $absensi,
            'summary' => $summary,
        ], 'Riwayat absensi berhasil diambil');
    }
}
