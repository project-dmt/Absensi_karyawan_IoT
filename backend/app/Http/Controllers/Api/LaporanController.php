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
            $search = addcslashes($validated['search'], '%_');
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
        $request->validate([
            'dari' => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
            'divisi_id' => 'nullable|exists:divisions,id',
            'status' => 'nullable|in:' . implode(',', config('absensi.statuses')),
            'search' => 'nullable|string|max:100',
        ]);

        $query = Attendance::with('employee.division')
            ->whereBetween('tanggal', [$request->dari, $request->sampai]);

        if ($request->filled('divisi_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('divisi_id', $request->divisi_id);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = addcslashes($request->search, '%_');
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('nip', 'like', "%{$search}%");
            });
        }

        $records = $query->orderBy('tanggal', 'desc')
            ->orderBy('employee_id')
            ->get();

        $filename = 'laporan_absensi_' . $request->dari . '_sd_' . $request->sampai . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($records) {
            $file = fopen('php://output', 'w');

            fputcsv($file, ['No', 'Tanggal', 'NIP', 'Nama', 'Divisi', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan']);

            $no = 1;
            foreach ($records as $row) {
                fputcsv($file, [
                    $no++,
                    $this->sanitizeCsvCell($row->tanggal instanceof \Carbon\Carbon
                        ? $row->tanggal->format('Y-m-d')
                        : $row->tanggal),
                    $this->sanitizeCsvCell($row->employee->nip ?? ''),
                    $this->sanitizeCsvCell($row->employee->nama ?? ''),
                    $this->sanitizeCsvCell($row->employee->division->nama_divisi ?? ''),
                    $row->jam_masuk ?? '-',
                    $row->jam_pulang ?? '-',
                    $this->sanitizeCsvCell($row->status),
                    $this->sanitizeCsvCell($row->keterangan ?? ''),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function sanitizeCsvCell($value): string
    {
        $value = (string) $value;
        if (in_array(substr($value, 0, 1), ['=', '+', '-', '@', "\t"], true)) {
            return "\t" . $value;
        }
        return $value;
    }
}
