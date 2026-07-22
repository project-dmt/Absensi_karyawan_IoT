<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use Carbon\Carbon;

class LaporanController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'dari' => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
            'divisi_id' => 'nullable|exists:divisions,id',
            'status' => 'nullable|in:Hadir,Terlambat,Alpha,Izin',
        ]);

        $query = Attendance::with('employee.division', 'inputBy')
            ->whereBetween('tanggal', [$request->dari, $request->sampai]);

        if ($request->divisi_id) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('divisi_id', $request->divisi_id);
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $laporan = $query->orderBy('tanggal', 'desc')
            ->orderBy('employee_id')
            ->paginate($request->per_page ?? 15);

        return $this->successResponse($laporan, 'Laporan absensi berhasil diambil');
    }

    public function export(Request $request)
    {
        // TODO: Export ke PDF/Excel
        return $this->successResponse(null, 'Fitur export akan segera tersedia');
    }
}
