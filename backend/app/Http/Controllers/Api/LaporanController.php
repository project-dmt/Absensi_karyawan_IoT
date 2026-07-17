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
        ]);

        $query = Attendance::with('employee.division', 'inputBy')
            ->whereBetween('tanggal', [$request->dari, $request->sampai]);

        if ($request->divisi_id) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('divisi_id', $request->divisi_id);
            });
        }

        $laporan = $query->orderBy('tanggal', 'desc')
            ->orderBy('employee_id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $laporan,
        ]);
    }

    public function export(Request $request)
    {
        // TODO: Export ke PDF/Excel
        return response()->json([
            'success' => true,
            'message' => 'Fitur export akan segera tersedia',
        ]);
    }
}
