<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Http\Requests\LaporanRequest;

class LaporanController extends Controller
{
    public function index(LaporanRequest $request)
    {
        $validated = $request->validated();

        $query = Attendance::with('employee.division', 'inputBy')
            ->whereBetween('tanggal', [$validated['dari'], $validated['sampai']]);

        if (isset($validated['divisi_id'])) {
            $query->whereHas('employee', function ($q) use ($validated) {
                $q->where('divisi_id', $validated['divisi_id']);
            });
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (isset($validated['search'])) {
            $search = $validated['search'];
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('nip', 'like', "%{$search}%");
            });
        }

        $perPage = $request->per_page ?? config('absensi.pagination.per_page');
        $laporan = $query->orderBy('tanggal', 'desc')
            ->orderBy('employee_id')
            ->paginate($perPage);

        return $this->successResponse($laporan, 'Laporan absensi berhasil diambil');
    }

    public function export(Request $request)
    {
        return response()->json([
            'success' => false,
            'message' => 'Fitur export belum diimplementasi',
        ], 501);
    }
}
